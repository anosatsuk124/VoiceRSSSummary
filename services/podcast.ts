import { promises as fs } from "fs";
import { dirname } from "path";
import {
  Episode,
  fetchAllEpisodes,
  performDatabaseIntegrityFixes,
} from "./database.js";
import path from "node:path";
import fsSync from "node:fs";
import { config } from "./config.js";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createItemXml(episode: Episode): string {
  const fileUrl = `${config.podcast.baseUrl}/podcast_audio/${path.basename(episode.audioPath)}`;
  const pubDate = new Date(episode.createdAt).toUTCString();

  let fileSize = 0;
  try {
    const audioPath = path.join(
      config.paths.podcastAudioDir,
      episode.audioPath,
    );
    if (fsSync.existsSync(audioPath)) {
      fileSize = fsSync.statSync(audioPath).size;
    }
  } catch (error) {
    console.warn(`Could not get file size for ${episode.audioPath}:`, error);
  }

  return `
    <item>
      <title><![CDATA[${escapeXml(episode.title)}]]></title>
      <description><![CDATA[${escapeXml(episode.title)}]]></description>
      <author>${escapeXml(config.podcast.author)}</author>
      <category>${escapeXml(config.podcast.categories)}</category>
      <language>${config.podcast.language}</language>
      <ttl>${config.podcast.ttl}</ttl>
      <enclosure url="${escapeXml(fileUrl)}" length="${fileSize}" type="audio/mpeg" />
      <guid>${escapeXml(fileUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
}

export async function updatePodcastRSS(): Promise<void> {
  try {
    const episodes: Episode[] = await fetchAllEpisodes();

    // Filter episodes to only include those with valid audio files
    const validEpisodes = episodes.filter((episode) => {
      try {
        const audioPath = path.join(
          config.paths.podcastAudioDir,
          episode.audioPath,
        );
        return fsSync.existsSync(audioPath);
      } catch (error) {
        console.warn(`Audio file not found for episode: ${episode.title}`);
        return false;
      }
    });

    console.log(
      `Found ${episodes.length} episodes, ${validEpisodes.length} with valid audio files`,
    );

    const lastBuildDate = new Date().toUTCString();
    const itemsXml = validEpisodes.map(createItemXml).join("\n");
    const outputPath = path.join(config.paths.publicDir, "podcast.xml");

    // Create RSS XML content
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(config.podcast.title)}</title>
    <link>${escapeXml(config.podcast.link)}</link>
    <description><![CDATA[${escapeXml(config.podcast.description)}]]></description>
    <language>${config.podcast.language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>${config.podcast.ttl}</ttl>
    <author>${escapeXml(config.podcast.author)}</author>
    <category>${escapeXml(config.podcast.categories)}</category>${itemsXml}
  </channel>
</rss>`;

    // Ensure directory exists
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, rssXml);

    console.log(
      `RSS feed updated with ${validEpisodes.length} episodes (audio files verified)`,
    );
  } catch (error) {
    console.error("Error updating podcast RSS:", error);
    throw error;
  }
}
