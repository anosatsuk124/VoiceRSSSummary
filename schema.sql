-- schema.sql
CREATE TABLE IF NOT EXISTS processed_feed_items (
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
);
