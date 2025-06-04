import Parser from "rss-parser";
import {
  openAI_ClassifyFeed,
  openAI_GeneratePodcastContent,
} from "../services/llm";
import { generateTTS } from "../services/tts";
import { saveEpisode, markAsProcessed } from "../services/database";
import { updatePodcastRSS } from "../services/podcast";
import crypto from "crypto";

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

  // フィードごとに処理
  for (const url of feedUrls) {
    try {
      await processFeedUrl(url);
    } finally {
      await updatePodcastRSS();
    }
  }

  console.log("処理完了:", new Date().toISOString());
}

const processFeedUrl = async (url: string) => {
  const parser = new Parser<FeedItem>();
  const feed = await parser.parseURL(url);

  // フィードのカテゴリ分類
  const feedTitle = feed.title || url;
  const category = await openAI_ClassifyFeed(feedTitle);
  console.log(`フィード分類完了: ${feedTitle} - ${category}`);

  // 昨日の記事のみフィルタリング
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayItems = feed.items.filter((item) => {
    const pub = new Date(item.pubDate || "");
    return (
      pub.getFullYear() === yesterday.getFullYear() &&
      pub.getMonth() === yesterday.getMonth() &&
      pub.getDate() === yesterday.getDate()
    );
  });

  if (yesterdayItems.length === 0) {
    console.log(`昨日の記事が見つかりません: ${feedTitle}`);
    return;
  }

  // ポッドキャスト原稿生成
  console.log(`ポッドキャスト原稿生成開始: ${feedTitle}`);
  const validItems = yesterdayItems.filter((item): item is FeedItem => {
    return !!item.title && !!item.link;
  });
  const podcastContent = await openAI_GeneratePodcastContent(
    feedTitle,
    validItems,
  );

  // トピックごとの統合音声生成
  const feedUrlHash = crypto.createHash("md5").update(url).digest("hex");
  const categoryHash = crypto.createHash("md5").update(category).digest("hex");
  const uniqueId = `${feedUrlHash}-${categoryHash}`;

  const audioFilePath = await generateTTS(uniqueId, podcastContent);
  console.log(`音声ファイル生成完了: ${audioFilePath}`);

  // エピソードとして保存（各フィードにつき1つの統合エピソード）
  const firstItem = yesterdayItems[0];
  if (!firstItem) {
    console.warn("アイテムが空です");
    return;
  }
  const pub = new Date(firstItem.pubDate || "");

  await saveEpisode({
    id: uniqueId,
    title: `${category}: ${feedTitle}`,
    pubDate: pub.toISOString(),
    audioPath: audioFilePath,
    sourceLink: url,
  });

  console.log(`エピソード保存完了: ${category} - ${feedTitle}`);

  // 個別記事の処理記録
  for (const item of yesterdayItems) {
    const itemId = item["id"] as string | undefined;
    const fallbackId = item.link || item.title || JSON.stringify(item);
    const finalItemId =
      itemId && typeof itemId === "string" && itemId.trim() !== ""
        ? itemId
        : `fallback-${Buffer.from(fallbackId).toString("base64")}`;

    if (!finalItemId || finalItemId.trim() === "") {
      console.warn(`フィードアイテムのIDを生成できませんでした`, {
        feedUrl: url,
        itemTitle: item.title,
        itemLink: item.link,
      });
      continue;
    }

    const already = await markAsProcessed(url, finalItemId);
    if (already) {
      console.log(`既に処理済み: ${finalItemId}`);
      continue;
    }
  }
};

main().catch((err) => {
  console.error("エラー発生:", err);
  process.exit(1);
});
