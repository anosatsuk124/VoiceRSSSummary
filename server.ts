import { Hono } from "hono";
import { serve } from "@hono/node-server";
import path from "path";
import { config, validateConfig } from "./services/config.js";
import { batchScheduler } from "./services/batch-scheduler.js";

// Validate configuration on startup
try {
  validateConfig();
  console.log("Configuration validated successfully");
} catch (error) {
  console.error("Configuration validation failed:", error);
  process.exit(1);
}

const app = new Hono();

// 静的ファイルの処理

// Static file handlers
app.get("/assets/*", async (c) => {
  try {
    const filePath = path.join(config.paths.frontendBuildDir, c.req.path);
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      const contentType = filePath.endsWith(".js")
        ? "application/javascript"
        : filePath.endsWith(".css")
          ? "text/css"
          : "application/octet-stream";
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, { "Content-Type": contentType });
    }
    return c.notFound();
  } catch (error) {
    console.error("Error serving asset:", error);
    return c.notFound();
  }
});

app.get("/podcast_audio/*", async (c) => {
  try {
    const audioFileName = c.req.path.substring("/podcast_audio/".length);
    
    // Basic security check
    if (audioFileName.includes("..") || audioFileName.includes("/")) {
      return c.notFound();
    }
    
    const audioFilePath = path.join(config.paths.podcastAudioDir, audioFileName);
    const file = Bun.file(audioFilePath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, { "Content-Type": "audio/mpeg" });
    }
    return c.notFound();
  } catch (error) {
    console.error("Error serving audio file:", error);
    return c.notFound();
  }
});

app.get("/podcast.xml", async (c) => {
  try {
    const filePath = path.join(config.paths.publicDir, "podcast.xml");
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      });
    }
    
    console.warn("podcast.xml not found");
    return c.notFound();
  } catch (error) {
    console.error("Error serving podcast.xml:", error);
    return c.notFound();
  }
});


// Frontend fallback routes
async function serveIndex(c: any) {
  try {
    const indexPath = path.join(config.paths.frontendBuildDir, "index.html");
    const file = Bun.file(indexPath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, { "Content-Type": "text/html; charset=utf-8" });
    }
    
    console.error(`index.html not found at ${indexPath}`);
    return c.text("Frontend not built. Run 'bun run build:frontend'", 404);
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.text("Internal server error", 500);
  }
}

app.get("/", serveIndex);

app.get("/index.html", serveIndex);

// API endpoints for frontend
app.get("/api/episodes", async (c) => {
  try {
    const { fetchEpisodesWithFeedInfo } = await import("./services/database.js");
    const episodes = await fetchEpisodesWithFeedInfo();
    return c.json({ episodes });
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return c.json({ error: "Failed to fetch episodes" }, 500);
  }
});

app.get("/api/episodes-from-xml", async (c) => {
  try {
    const xml2js = await import("xml2js");
    const fs = await import("fs");
    const podcastXmlPath = path.join(config.paths.publicDir, "podcast.xml");
    
    // Check if podcast.xml exists
    if (!fs.existsSync(podcastXmlPath)) {
      return c.json({ episodes: [], message: "podcast.xml not found" });
    }

    // Read and parse XML
    const xmlContent = fs.readFileSync(podcastXmlPath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    const episodes = [];
    const items = result?.rss?.channel?.[0]?.item || [];
    
    for (const item of items) {
      const episode = {
        id: generateEpisodeId(item),
        title: item.title?.[0] || 'Untitled',
        description: item.description?.[0] || '',
        pubDate: item.pubDate?.[0] || '',
        audioUrl: item.enclosure?.[0]?.$?.url || '',
        audioLength: item.enclosure?.[0]?.$?.length || '0',
        guid: item.guid?.[0] || '',
        link: item.link?.[0] || ''
      };
      episodes.push(episode);
    }
    
    return c.json({ episodes });
  } catch (error) {
    console.error("Error parsing podcast XML:", error);
    return c.json({ error: "Failed to parse podcast XML" }, 500);
  }
});

// Helper function to generate episode ID from XML item
function generateEpisodeId(item: any): string {
  // Use GUID if available, otherwise generate from title and audio URL
  if (item.guid?.[0]) {
    return encodeURIComponent(item.guid[0].replace(/[^a-zA-Z0-9-_]/g, '-'));
  }
  
  const title = item.title?.[0] || '';
  const audioUrl = item.enclosure?.[0]?.$?.url || '';
  const titleSlug = title.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  // Extract filename from audio URL as fallback
  const audioFilename = audioUrl.split('/').pop()?.split('.')[0] || 'episode';
  
  return titleSlug || audioFilename;
}

app.get("/api/episode/:episodeId", async (c) => {
  try {
    const episodeId = c.req.param("episodeId");
    const xml2js = await import("xml2js");
    const fs = await import("fs");
    const podcastXmlPath = path.join(config.paths.publicDir, "podcast.xml");
    
    if (!fs.existsSync(podcastXmlPath)) {
      return c.json({ error: "podcast.xml not found" }, 404);
    }

    const xmlContent = fs.readFileSync(podcastXmlPath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    const items = result?.rss?.channel?.[0]?.item || [];
    const targetItem = items.find((item: any) => generateEpisodeId(item) === episodeId);
    
    if (!targetItem) {
      return c.json({ error: "Episode not found" }, 404);
    }
    
    const episode = {
      id: episodeId,
      title: targetItem.title?.[0] || 'Untitled',
      description: targetItem.description?.[0] || '',
      pubDate: targetItem.pubDate?.[0] || '',
      audioUrl: targetItem.enclosure?.[0]?.$?.url || '',
      audioLength: targetItem.enclosure?.[0]?.$?.length || '0',
      guid: targetItem.guid?.[0] || '',
      link: targetItem.link?.[0] || ''
    };
    
    return c.json({ episode });
  } catch (error) {
    console.error("Error fetching episode:", error);
    return c.json({ error: "Failed to fetch episode" }, 500);
  }
});

app.get("/api/feeds", async (c) => {
  try {
    const { fetchActiveFeeds } = await import("./services/database.js");
    const feeds = await fetchActiveFeeds();
    return c.json({ feeds });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return c.json({ error: "Failed to fetch feeds" }, 500);
  }
});

app.get("/api/feeds/:feedId", async (c) => {
  try {
    const feedId = c.req.param("feedId");
    const { getFeedById } = await import("./services/database.js");
    const feed = await getFeedById(feedId);
    
    if (!feed) {
      return c.json({ error: "Feed not found" }, 404);
    }
    
    return c.json({ feed });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return c.json({ error: "Failed to fetch feed" }, 500);
  }
});

app.get("/api/feeds/:feedId/episodes", async (c) => {
  try {
    const feedId = c.req.param("feedId");
    const { fetchEpisodesByFeedId } = await import("./services/database.js");
    const episodes = await fetchEpisodesByFeedId(feedId);
    return c.json({ episodes });
  } catch (error) {
    console.error("Error fetching episodes by feed:", error);
    return c.json({ error: "Failed to fetch episodes by feed" }, 500);
  }
});

app.get("/api/episodes-with-feed-info", async (c) => {
  try {
    const { fetchEpisodesWithFeedInfo } = await import("./services/database.js");
    const episodes = await fetchEpisodesWithFeedInfo();
    return c.json({ episodes });
  } catch (error) {
    console.error("Error fetching episodes with feed info:", error);
    return c.json({ error: "Failed to fetch episodes with feed info" }, 500);
  }
});

app.get("/api/episode-with-source/:episodeId", async (c) => {
  try {
    const episodeId = c.req.param("episodeId");
    const { fetchEpisodeWithSourceInfo } = await import("./services/database.js");
    const episode = await fetchEpisodeWithSourceInfo(episodeId);
    
    if (!episode) {
      return c.json({ error: "Episode not found" }, 404);
    }
    
    return c.json({ episode });
  } catch (error) {
    console.error("Error fetching episode with source info:", error);
    return c.json({ error: "Failed to fetch episode with source info" }, 500);
  }
});

app.post("/api/feed-requests", async (c) => {
  try {
    const body = await c.req.json();
    const { url, requestMessage } = body;
    
    if (!url || typeof url !== 'string') {
      return c.json({ error: "URL is required" }, 400);
    }

    const { submitFeedRequest } = await import("./services/database.js");
    const requestId = await submitFeedRequest({
      url,
      requestMessage,
    });
    
    return c.json({ 
      success: true, 
      message: "Feed request submitted successfully",
      requestId 
    });
  } catch (error) {
    console.error("Error submitting feed request:", error);
    return c.json({ error: "Failed to submit feed request" }, 500);
  }
});

// Catch-all for SPA routing
app.get("*", serveIndex);

// Batch processing - now using batch scheduler
console.log("🔄 Batch scheduler initialized and ready");

// サーバー起動
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`🌟 Server is running on http://localhost:${info.port}`);
    console.log(`📡 Using configuration from: ${config.paths.projectRoot}`);
    console.log(`🗄️  Database: ${config.paths.dbPath}`);
    console.log(`🔄 Batch scheduler is active and will manage automatic processing`);
  },
);
