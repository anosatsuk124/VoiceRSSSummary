import { promises as fs } from "fs";
import { join, dirname } from "path";
import { Episode, fetchAllEpisodes } from "./database";
import path from "node:path";
import fsSync from "node:fs";

export async function updatePodcastRSS() {
  const episodes: Episode[] = await fetchAllEpisodes();

  const channelTitle = process.env["PODCAST_TITLE"] ?? "自動生成ポッドキャスト";
  const channelLink =
    process.env["PODCAST_LINK"] ?? "https://your-domain.com/podcast";
  const channelDescription =
    process.env["PODCAST_DESCRIPTION"] ??
    "RSSフィードから自動生成された音声ポッドキャスト";
  const channelLanguage = process.env["PODCAST_LANGUAGE"] ?? "ja";
  const channelAuthor = process.env["PODCAST_AUTHOR"] ?? "管理者";
  const channelCategories = process.env["PODCAST_CATEGORIES"] ?? "Technology";
  const channelTTL = process.env["PODCAST_TTL"] ?? "60";
  const lastBuildDate = new Date().toUTCString();

  let itemsXml = "";
  for (const ep of episodes) {
    const fileUrl = `https://your-domain.com/podcast_audio/${path.basename(ep.audioPath)}`;
    const pubDate = new Date(ep.pubDate).toUTCString();
    const fileSize = fsSync.statSync(ep.audioPath).size;
    itemsXml += `
      <item>
        <title><![CDATA[${ep.title}]]></title>
        <description><![CDATA[${ep.title.replace(/\]\]>/g, "]]&gt;")}]]></description>
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

  const outputPath = join(__dirname, "../public/podcast.xml");
  // Ensure directory exists
  await fs.mkdir(dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, rssXml.trim());
}
