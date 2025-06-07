import Parser from "rss-parser";
import {
  openAI_ClassifyFeed,
  openAI_GeneratePodcastContent,
} from "../services/llm.js";
import { generateTTS } from "../services/tts.js";
import {
  saveFeed,
  getFeedByUrl,
  saveArticle,
  getUnprocessedArticles,
  markArticleAsProcessed,
  saveEpisode,
} from "../services/database.js";
import { updatePodcastRSS } from "../services/podcast.js";
import { config } from "../services/config.js";
import crypto from "crypto";
import fs from "fs/promises";

interface FeedItem {
  id?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  description?: string;
}

/**
 * Main batch processing function
 * Processes all feeds and generates podcasts for new articles
 */
export async function batchProcess(): Promise<void> {
  try {
    console.log("🚀 Starting enhanced batch process...");

    // Load feed URLs from file
    const feedUrls = await loadFeedUrls();
    if (feedUrls.length === 0) {
      console.log("ℹ️  No feed URLs found.");
      return;
    }

    console.log(`📡 Processing ${feedUrls.length} feeds...`);

    // Process each feed URL
    for (const url of feedUrls) {
      try {
        await processFeedUrl(url);
      } catch (error) {
        console.error(`❌ Failed to process feed ${url}:`, error);
        // Continue with other feeds
      }
    }

    // Process unprocessed articles and generate podcasts
    await processUnprocessedArticles();

    console.log(
      "✅ Enhanced batch process completed:",
      new Date().toISOString(),
    );
  } catch (error) {
    console.error("💥 Batch process failed:", error);
    throw error;
  }
}

/**
 * Load feed URLs from configuration file
 */
async function loadFeedUrls(): Promise<string[]> {
  try {
    const data = await fs.readFile(config.paths.feedUrlsFile, "utf-8");
    return data
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && !url.startsWith("#"));
  } catch (err) {
    console.warn(
      `⚠️  Failed to read feed URLs file: ${config.paths.feedUrlsFile}`,
    );
    console.warn("📝 Please create the file with one RSS URL per line.");
    return [];
  }
}

/**
 * Process a single feed URL and discover new articles
 */
async function processFeedUrl(url: string): Promise<void> {
  if (!url || !url.startsWith("http")) {
    throw new Error(`Invalid feed URL: ${url}`);
  }

  console.log(`🔍 Processing feed: ${url}`);

  try {
    // Parse RSS feed
    const parser = new Parser<FeedItem>();
    const feed = await parser.parseURL(url);

    // Get or create feed record
    let feedRecord = await getFeedByUrl(url);
    if (!feedRecord) {
      console.log(`➕ Adding new feed: ${feed.title || url}`);
      await saveFeed({
        url,
        title: feed.title,
        description: feed.description,
        lastUpdated: new Date().toISOString(),
        active: true,
      });
      feedRecord = await getFeedByUrl(url);
    }

    if (!feedRecord) {
      throw new Error("Failed to create or retrieve feed record");
    }

    // Process feed items and save new articles
    const newArticlesCount = await discoverNewArticles(
      feedRecord,
      feed.items || [],
    );

    // Update feed last updated timestamp
    if (newArticlesCount > 0) {
      await saveFeed({
        url: feedRecord.url,
        title: feedRecord.title,
        description: feedRecord.description,
        lastUpdated: new Date().toISOString(),
        active: feedRecord.active,
      });
    }

    console.log(
      `📊 Feed processed: ${feed.title || url} (${newArticlesCount} new articles)`,
    );
  } catch (error) {
    console.error(`💥 Error processing feed ${url}:`, error);
    throw error;
  }
}

/**
 * Discover and save new articles from feed items
 */
async function discoverNewArticles(
  feed: any,
  items: FeedItem[],
): Promise<number> {
  let newArticlesCount = 0;

  for (const item of items) {
    if (!item.title || !item.link) {
      console.warn("⚠️  Skipping item without title or link");
      continue;
    }

    try {
      // Generate article ID based on link
      const articleId = await saveArticle({
        feedId: feed.id,
        title: item.title,
        link: item.link,
        description: item.description || item.contentSnippet,
        content: item.content,
        pubDate: item.pubDate || new Date().toISOString(),
        processed: false,
      });

      // Check if this is truly a new article
      if (articleId) {
        newArticlesCount++;
        console.log(`📄 New article discovered: ${item.title}`);
      }
    } catch (error) {
      console.error(`❌ Error saving article: ${item.title}`, error);
    }
  }

  return newArticlesCount;
}

/**
 * Process unprocessed articles and generate podcasts
 */
async function processUnprocessedArticles(): Promise<void> {
  console.log("🎧 Processing unprocessed articles...");

  try {
    // Process retry queue first
    await processRetryQueue();

    // Get unprocessed articles (limit to prevent overwhelming)
    const unprocessedArticles = await getUnprocessedArticles(
      Number.parseInt(import.meta.env["LIMIT_UNPROCESSED_ARTICLES"] || "10"),
    );

    if (unprocessedArticles.length === 0) {
      console.log("ℹ️  No unprocessed articles found.");
      return;
    }

    console.log(`🎯 Found ${unprocessedArticles.length} unprocessed articles`);

    // Track articles that successfully generated audio
    const successfullyGeneratedArticles: string[] = [];

    for (const article of unprocessedArticles) {
      try {
        await generatePodcastForArticle(article);
        await markArticleAsProcessed(article.id);
        console.log(`✅ Podcast generated for: ${article.title}`);
        successfullyGeneratedArticles.push(article.id);
      } catch (error) {
        console.error(
          `❌ Failed to generate podcast for article: ${article.title}`,
          error,
        );
        // Don't mark as processed if generation failed
      }
    }

    // Only update RSS if at least one article was successfully processed
    if (successfullyGeneratedArticles.length > 0) {
      console.log(`📻 Updating podcast RSS for ${successfullyGeneratedArticles.length} new episodes...`);
      await updatePodcastRSS();
    }
  } catch (error) {
    console.error("💥 Error processing unprocessed articles:", error);
    throw error;
  }
}

/**
 * Process retry queue for failed TTS generation
 */
async function processRetryQueue(): Promise<void> {
  const { getQueueItems, updateQueueItemStatus, removeFromQueue } = await import("../services/database.js");
  
  console.log("🔄 Processing TTS retry queue...");
  
  try {
    const queueItems = await getQueueItems(5); // Process 5 items at a time
    
    if (queueItems.length === 0) {
      return;
    }

    console.log(`📋 Found ${queueItems.length} items in retry queue`);

    for (const item of queueItems) {
      try {
        console.log(`🔁 Retrying TTS generation for: ${item.itemId} (attempt ${item.retryCount + 1})`);
        
        // Mark as processing
        await updateQueueItemStatus(item.id, 'processing');
        
        // Attempt TTS generation
        await generateTTS(item.itemId, item.scriptText, item.retryCount);
        
        // Success - remove from queue
        await removeFromQueue(item.id);
        console.log(`✅ TTS retry successful for: ${item.itemId}`);
        
      } catch (error) {
        console.error(`❌ TTS retry failed for: ${item.itemId}`, error);
        
        if (item.retryCount >= 2) {
          // Max retries reached, mark as failed
          await updateQueueItemStatus(item.id, 'failed');
          console.log(`💀 Max retries reached for: ${item.itemId}, marking as failed`);
        } else {
          // Reset to pending for next retry
          await updateQueueItemStatus(item.id, 'pending');
        }
      }
    }
  } catch (error) {
    console.error("💥 Error processing retry queue:", error);
    throw error;
  }
}

/**
 * Generate podcast for a single article
 */
async function generatePodcastForArticle(article: any): Promise<void> {
  console.log(`🎤 Generating podcast for: ${article.title}`);

  try {
    // Get feed information for context
    const feed = await getFeedByUrl(article.feedId);
    const feedTitle = feed?.title || "Unknown Feed";

    // Classify the article/feed
    const category = await openAI_ClassifyFeed(
      `${feedTitle}: ${article.title}`,
    );
    console.log(`🏷️  Article classified as: ${category}`);

    // Generate podcast content for this single article
    const podcastContent = await openAI_GeneratePodcastContent(article.title, [
      {
        title: article.title,
        link: article.link,
      },
    ]);

    // Generate unique ID for the episode
    const episodeId = crypto.randomUUID();

    // Generate TTS audio
    const audioFilePath = await generateTTS(episodeId, podcastContent);
    console.log(`🔊 Audio generated: ${audioFilePath}`);

    // Get audio file stats
    const audioStats = await getAudioFileStats(audioFilePath);

    // Save episode
    await saveEpisode({
      articleId: article.id,
      title: `${category}: ${article.title}`,
      description:
        article.description || `Podcast episode for: ${article.title}`,
      audioPath: audioFilePath,
      duration: audioStats.duration,
      fileSize: audioStats.size,
    });

    console.log(`💾 Episode saved for article: ${article.title}`);
  } catch (error) {
    console.error(
      `💥 Error generating podcast for article: ${article.title}`,
      error,
    );
    throw error;
  }
}

/**
 * Get audio file statistics
 */
async function getAudioFileStats(
  audioFileName: string,
): Promise<{ duration?: number; size: number }> {
  try {
    const audioPath = `${config.paths.podcastAudioDir}/${audioFileName}`;
    const stats = await fs.stat(audioPath);

    return {
      size: stats.size,
      // TODO: Add duration calculation using ffprobe if needed
      duration: undefined,
    };
  } catch (error) {
    console.warn(
      `⚠️  Could not get audio file stats for ${audioFileName}:`,
      error,
    );
    return { size: 0 };
  }
}

/**
 * Legacy function compatibility - process feed URL the old way
 * This is kept for backward compatibility during migration
 */
// Commented out to fix TypeScript unused variable warnings
/* async function legacyProcessFeedUrl(url: string): Promise<void> {
  console.log(`🔄 Legacy processing for: ${url}`);
  
  const parser = new Parser<FeedItem>();
  const feed = await parser.parseURL(url);

  // Feed classification
  const feedTitle = feed.title || url;
  const category = await openAI_ClassifyFeed(feedTitle);
  console.log(`Feed classified: ${feedTitle} - ${category}`);

  const latest5Items = (feed.items || []).slice(0, 5);
  
  if (latest5Items.length === 0) {
    console.log(`No items found in feed: ${feedTitle}`);
    return;
  }

  // Generate podcast content (old way - multiple articles in one podcast)
  console.log(`Generating podcast content for: ${feedTitle}`);
  const validItems = latest5Items.filter((item): item is FeedItem => {
    return !!item.title && !!item.link;
  });
  
  if (validItems.length === 0) {
    console.log(`No valid items found in feed: ${feedTitle}`);
    return;
  }
  
  const podcastContent = await openAI_GeneratePodcastContent(
    feedTitle,
    validItems as any
  );

  // Generate unique ID for this feed and category combination
  const feedUrlHash = crypto.createHash("md5").update(url).digest("hex");
  const categoryHash = crypto.createHash("md5").update(category).digest("hex");
  const timestamp = new Date().getTime();
  const uniqueId = `${feedUrlHash}-${categoryHash}-${timestamp}`;

  const audioFilePath = await generateTTS(uniqueId, podcastContent);
  console.log(`Audio file generated: ${audioFilePath}`);

  // Save as legacy episode
  const firstItem = latest5Items[0];
  if (!firstItem) {
    console.warn("No items found");
    return;
  }
  
  const pubDate = new Date(firstItem.pubDate || new Date());

  // For now, save using the new episode structure
  // TODO: Remove this once migration is complete
  const tempArticleId = crypto.randomUUID();
  await saveEpisode({
    articleId: tempArticleId,
    title: `${category}: ${feedTitle}`,
    description: `Legacy podcast for feed: ${feedTitle}`,
    audioPath: audioFilePath
  });

  console.log(`Legacy episode saved: ${category} - ${feedTitle}`);

  // Mark individual articles as processed (legacy)
  for (const item of latest5Items) {
    try {
      const itemId = (item as any)["id"] as string | undefined;
      const fallbackId = item.link || item.title || JSON.stringify(item);
      const finalItemId = itemId && typeof itemId === "string" && itemId.trim() !== ""
        ? itemId
        : `fallback-${Buffer.from(fallbackId).toString("base64")}`;

      if (!finalItemId || finalItemId.trim() === "") {
        console.warn(`Could not generate ID for feed item`, {
          feedUrl: url,
          itemTitle: item.title,
          itemLink: item.link,
        });
        continue;
      }

      const alreadyProcessed = await markAsProcessed(url, finalItemId);
      if (alreadyProcessed) {
        console.log(`Already processed: ${finalItemId}`);
      }
    } catch (error) {
      console.error(`Error marking item as processed:`, error);
    }
  }
} */

// Export function for use in server
export async function addNewFeedUrl(feedUrl: string): Promise<void> {
  if (!feedUrl || !feedUrl.startsWith("http")) {
    throw new Error("Invalid feed URL");
  }

  try {
    // Add to feeds table
    await saveFeed({
      url: feedUrl,
      active: true,
    });

    console.log(`✅ Feed URL added: ${feedUrl}`);
  } catch (error) {
    console.error(`❌ Failed to add feed URL: ${feedUrl}`, error);
    throw error;
  }
}

// Run if this script is executed directly
if (import.meta.main) {
  batchProcess().catch((err) => {
    console.error("💥 Batch process failed:", err);
    process.exit(1);
  });
}
