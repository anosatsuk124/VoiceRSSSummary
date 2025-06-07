-- schema.sql
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  last_updated TEXT,
  created_at TEXT NOT NULL,
  active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  pub_date TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  processed BOOLEAN DEFAULT 0,
  FOREIGN KEY(feed_id) REFERENCES feeds(id)
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_path TEXT NOT NULL,
  duration INTEGER,
  file_size INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(article_id) REFERENCES articles(id)
);

-- Migration: Keep existing data structure for backward compatibility
CREATE TABLE IF NOT EXISTS processed_feed_items (
  feed_url TEXT NOT NULL,
  item_id   TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  PRIMARY KEY(feed_url, item_id)
);

-- TTS generation retry queue
CREATE TABLE IF NOT EXISTS tts_queue (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  script_text TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  last_attempted_at TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);
CREATE INDEX IF NOT EXISTS idx_articles_processed ON articles(processed);
CREATE INDEX IF NOT EXISTS idx_episodes_article_id ON episodes(article_id);
CREATE INDEX IF NOT EXISTS idx_feeds_active ON feeds(active);
CREATE INDEX IF NOT EXISTS idx_tts_queue_status ON tts_queue(status);
CREATE INDEX IF NOT EXISTS idx_tts_queue_created_at ON tts_queue(created_at);
