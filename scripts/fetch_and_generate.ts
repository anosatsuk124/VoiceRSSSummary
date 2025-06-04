import Parser from "rss-parser";
import { openAI_GenerateScript } from "../services/llm";
import { generateTTS } from "../services/tts";
import { saveEpisode, markAsProcessed } from "../services/database";
import { updatePodcastRSS } from "../services/podcast";

interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
}

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const parser = new Parser<FeedItem>();
  const feedUrlsFile = import.meta.env["FEED_URLS_FILE"] ?? "feed_urls.txt";
  const feedUrlsPath = path.resolve(__dirname, "..", feedUrlsFile);
  let feedUrls: string[];
  try {
    const data = await fs.readFile(feedUrlsPath, "utf-8");
    feedUrls = data
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  } catch (err) {
    console.warn(`フィードURLファイルの読み込みに失敗: ${feedUrlsFile}`);
    feedUrls = [];
  }

  for (const url of feedUrls) {
    const feed = await parser.parseURL(url);
    for (const item of feed.items) {
      const pub = new Date(item.pubDate || "");
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (
        pub.getFullYear() === yesterday.getFullYear() &&
        pub.getMonth() === yesterday.getMonth() &&
        pub.getDate() === yesterday.getDate()
      ) {
        // Use item.id if available, otherwise generate fallback ID from title or link
        const itemId = item["id"] as string | undefined;
        const fallbackId = item.link || item.title || JSON.stringify(item);
        const finalItemId = itemId && typeof itemId === 'string' && itemId.trim() !== '' 
          ? itemId 
          : `fallback-${Buffer.from(fallbackId).toString('base64')}`;
        
        // Skip if even the fallback ID is missing (should be rare)
        if (!finalItemId || finalItemId.trim() === '') {
          console.warn(`フィードアイテムのIDを生成できませんでした`, {
            feedUrl: url,
            itemTitle: item.title,
            itemLink: item.link
          });
          continue;
        }

        const already = await markAsProcessed(url, itemId);
        if (already) continue;

        const scriptText = await openAI_GenerateScript({
          title: item.title ?? "",
          link: item.link ?? "",
          contentSnippet: item.contentSnippet ?? "",
        });
        const audioFilePath = await generateTTS(
          item["id"] as string,
          scriptText,
        );

        await saveEpisode({
          id: item["id"] as string,
          title: item.title ?? "",
          pubDate: pub.toISOString(),
          audioPath: audioFilePath,
          sourceLink: item.link ?? "",
        });
      }
    }
  }

  await updatePodcastRSS();
  console.log("処理完了:", new Date().toISOString());
}

main().catch((err) => {
  console.error("エラー発生:", err);
  process.exit(1);
});
