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

async function main() {
  const parser = new Parser<FeedItem>();
  const feedUrls = [
    "https://example.com/feed1.rss",
  ];

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
        const already = await markAsProcessed(url, item.id);
        if (already) continue;

        const scriptText = await openAI_GenerateScript(item);
        const audioFilePath = await generateTTS(item.id, scriptText);

        await saveEpisode({
          id: item.id,
          title: item.title,
          pubDate: pub.toISOString(),
          audioPath: audioFilePath,
          sourceLink: item.link,
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
