import { Database } from "bun:sqlite";
import path from "path";

const dbPath = path.join(__dirname, "../data/podcast.db");
const db = new Database(dbPath);

// Ensure schema is set up
db.exec(`CREATE TABLE IF NOT EXISTS processed_feed_items (
  feed_url TEXT NOT NULL,
  item_id   TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  PRIMARY KEY(feed_url, item_id)
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pubDate TEXT NOT NULL,
  audioPath TEXT NOT NULL,
  sourceLink TEXT NOT NULL
);`);

export interface Episode {
  id: string;
  title: string;
  pubDate: string;
  audioPath: string;
  sourceLink: string;
}

export async function markAsProcessed(
  feedUrl: string,
  itemId: string,
): Promise<boolean> {
  const stmt = db.prepare(
    "SELECT 1 FROM processed_feed_items WHERE feed_url = ? AND item_id = ?",
  );
  const row = stmt.get(feedUrl, itemId);
  if (row) return true;
  const insert = db.prepare(
    "INSERT INTO processed_feed_items (feed_url, item_id, processed_at) VALUES (?, ?, ?)",
  );
  insert.run(feedUrl, itemId, new Date().toISOString());
  return false;
}

export async function saveEpisode(ep: Episode): Promise<void> {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO episodes (id, title, pubDate, audioPath, sourceLink) VALUES (?, ?, ?, ?, ?)",
  );
  stmt.run(ep.id, ep.title, ep.pubDate, ep.audioPath, ep.sourceLink);
}

export async function fetchAllEpisodes(): Promise<Episode[]> {
  const stmt = db.prepare("SELECT * FROM episodes ORDER BY pubDate DESC");
  return stmt.all();
}
