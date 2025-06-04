import { promises as fs } from "fs";
import { join, dirname } from "path";
import { Episode, fetchAllEpisodes } from "./database";
import path from "node:path";
import fsSync from "node:fs";

export async function updatePodcastRSS() {
  const episodes: Episode[] = await fetchAllEpisodes();

  const channelTitle =
    import.meta.env["PODCAST_TITLE"] ?? "自動生成ポッドキャスト";
  const channelLink =
    import.meta.env["PODCAST_LINK"] ?? "https://your-domain.com/podcast";
  const channelDescription =
    import.meta.env["PODCAST_DESCRIPTION"] ??
    "RSSフィードから自動生成された音声ポッドキャスト";
  const channelLanguage = import.meta.env["PODCAST_LANGUAGE"] ?? "ja";
  const channelAuthor = import.meta.env["PODCAST_AUTHOR"] ?? "管理者";
  const channelCategories =
    import.meta.env["PODCAST_CATEGORIES"] ?? "Technology";
  const channelTTL = import.meta.env["PODCAST_TTL"] ?? "60";
  const lastBuildDate = new Date().toUTCString();
  const baseUrl =
    import.meta.env["PODCAST_BASE_URL"] ?? "https://your-domain.com";

  let itemsXml = "";
  for (const ep of episodes) {
    const fileUrl = `${baseUrl}/podcast_audio/${path.basename(ep.audioPath)}`;
    const pubDate = new Date(ep.pubDate).toUTCString();
    const fileSize = fsSync.statSync(
      path.join(import.meta.dir, "..", "public/podcast_audio", ep.audioPath),
    ).size;
    itemsXml += `
      <item>
        <title><![CDATA[${ep.title}]]></title>
        <description><![CDATA[${ep.title.replace(/\]\]>/g, "]]&gt;").replace(/&/g, "&amp;")}]]></description>
        <author>${channelAuthor}</author>
        <category>${channelCategories}</category>
        <language>${channelLanguage}</language>
        <ttl>${channelTTL}</ttl>
        <enclosure url="${fileUrl}" length="${fileSize}" type="audio/wav" />
        <guid>${fileUrl}</guid>
        <pubDate>${pubDate}</pubDate>
      </item>
    `;
  }

  const outputPath = join(__dirname, "../public/podcast.xml");

  // 既存のRSSファイルの読み込み
  let existingXml = "";
  try {
    existingXml = await fs.readFile(outputPath, "utf-8");
  } catch (err) {
    // ファイルが存在しない場合は新規作成
    console.log("既存のpodcast.xmlが見つかりません。新規作成します。");
  }

  if (existingXml) {
    // 既存のitem部分を抽出
    const existingItemsMatch = existingXml.match(
      /<channel>([\s\S]*?)<\/channel>/,
    );
    if (existingItemsMatch) {
      const existingItems = existingItemsMatch[1];
      const newItemStartIndex = existingItems!.lastIndexOf("<item>");

      // 新しいitemを追加
      const updatedItems = existingItems + itemsXml;

      // lastBuildDateを更新
      const updatedXml = existingXml.replace(
        /<lastBuildDate>.*?<\/lastBuildDate>/,
        `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
      );

      // items部分を置き換え
      const finalXml = updatedXml.replace(
        /<channel>[\s\S]*?<\/channel>/,
        `<channel>${updatedItems}</channel>`,
      );

      // ファイルに書き込み
      await fs.writeFile(outputPath, finalXml.trim());
    } else {
      // 不正なフォーマットの場合は新規作成
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>${channelTitle}</title>
          <link>${channelLink}</link>
          <description>${channelDescription}]]></description>
          <lastBuildDate>${lastBuildDate}</lastBuildDate>
          ${itemsXml}
        </channel>
      </rss>
      `;
      await fs.writeFile(outputPath, rssXml.trim());
    }
  } else {
    // 新規作成
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>${channelTitle}</title>
        <link>${channelLink}</link>
        <description><![CDATA[${channelDescription}]]></description>
        <lastBuildDate>${lastBuildDate}</lastBuildDate>
        ${itemsXml}
      </channel>
    </rss>
    `;

    // Ensure directory exists
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, rssXml.trim());
  }
}
