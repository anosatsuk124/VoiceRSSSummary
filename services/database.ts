import { Database } from "bun:sqlite";
import fs from "fs";
import crypto from "crypto";
import { config } from "./config.js";

// Initialize database with proper error handling
function initializeDatabase(): Database {
  // Ensure data directory exists
  if (!fs.existsSync(config.paths.dataDir)) {
    fs.mkdirSync(config.paths.dataDir, { recursive: true });
  }

  // Create database file if it doesn't exist
  if (!fs.existsSync(config.paths.dbPath)) {
    fs.closeSync(fs.openSync(config.paths.dbPath, "w"));
  }

  const db = new Database(config.paths.dbPath);
  
  // Enable WAL mode for better concurrent access
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA cache_size = 1000;");
  db.exec("PRAGMA temp_store = memory;");

  // Ensure schema is set up - use the complete schema
  db.exec(`CREATE TABLE IF NOT EXISTS feeds (
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

  CREATE TABLE IF NOT EXISTS processed_feed_items (
    feed_url TEXT NOT NULL,
    item_id   TEXT NOT NULL,
    processed_at TEXT NOT NULL,
    PRIMARY KEY(feed_url, item_id)
  );

  CREATE TABLE IF NOT EXISTS tts_queue (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    script_text TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_attempted_at TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed'))
  );

  CREATE TABLE IF NOT EXISTS feed_requests (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    requested_by TEXT,
    request_message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT,
    admin_notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
  CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);
  CREATE INDEX IF NOT EXISTS idx_articles_processed ON articles(processed);
  CREATE INDEX IF NOT EXISTS idx_episodes_article_id ON episodes(article_id);
  CREATE INDEX IF NOT EXISTS idx_feeds_active ON feeds(active);
  CREATE INDEX IF NOT EXISTS idx_tts_queue_status ON tts_queue(status);
  CREATE INDEX IF NOT EXISTS idx_tts_queue_created_at ON tts_queue(created_at);
  CREATE INDEX IF NOT EXISTS idx_feed_requests_status ON feed_requests(status);
  CREATE INDEX IF NOT EXISTS idx_feed_requests_created_at ON feed_requests(created_at);`);

  return db;
}

const db = initializeDatabase();

export interface Feed {
  id: string;
  url: string;
  title?: string;
  description?: string;
  lastUpdated?: string;
  createdAt: string;
  active: boolean;
}

export interface Article {
  id: string;
  feedId: string;
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate: string;
  discoveredAt: string;
  processed: boolean;
}

export interface Episode {
  id: string;
  articleId: string;
  title: string;
  description?: string;
  audioPath: string;
  duration?: number;
  fileSize?: number;
  createdAt: string;
}

// Legacy interface for backward compatibility
export interface LegacyEpisode {
  id: string;
  title: string;
  pubDate: string;
  audioPath: string;
  sourceLink: string;
}

// Feed management functions
export async function saveFeed(
  feed: Omit<Feed, "id" | "createdAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO feeds (id, url, title, description, last_updated, created_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    stmt.run(
      id,
      feed.url,
      feed.title || null,
      feed.description || null,
      feed.lastUpdated || null,
      createdAt,
      feed.active ? 1 : 0,
    );
    return id;
  } catch (error) {
    console.error("Error saving feed:", error);
    throw error;
  }
}

export async function getFeedByUrl(url: string): Promise<Feed | null> {
  try {
    const stmt = db.prepare("SELECT * FROM feeds WHERE url = ?");
    const row = stmt.get(url) as any;
    if (!row) return null;

    return {
      id: row.id,
      url: row.url,
      title: row.title,
      description: row.description,
      lastUpdated: row.last_updated,
      createdAt: row.created_at,
      active: Boolean(row.active),
    };
  } catch (error) {
    console.error("Error getting feed by URL:", error);
    throw error;
  }
}

export async function getAllFeeds(): Promise<Feed[]> {
  try {
    const stmt = db.prepare(
      "SELECT * FROM feeds WHERE active = 1 ORDER BY created_at DESC",
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      description: row.description,
      lastUpdated: row.last_updated,
      createdAt: row.created_at,
      active: Boolean(row.active),
    }));
  } catch (error) {
    console.error("Error getting all feeds:", error);
    throw error;
  }
}

export async function getAllFeedsIncludingInactive(): Promise<Feed[]> {
  try {
    const stmt = db.prepare(
      "SELECT * FROM feeds ORDER BY created_at DESC",
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      description: row.description,
      lastUpdated: row.last_updated,
      createdAt: row.created_at,
      active: Boolean(row.active),
    }));
  } catch (error) {
    console.error("Error getting all feeds including inactive:", error);
    throw error;
  }
}

export async function deleteFeed(feedId: string): Promise<boolean> {
  try {
    // Start transaction
    db.exec("BEGIN TRANSACTION");
    
    // Delete all episodes for articles belonging to this feed
    const deleteEpisodesStmt = db.prepare(`
      DELETE FROM episodes 
      WHERE article_id IN (
        SELECT id FROM articles WHERE feed_id = ?
      )
    `);
    deleteEpisodesStmt.run(feedId);
    
    // Delete all articles for this feed
    const deleteArticlesStmt = db.prepare("DELETE FROM articles WHERE feed_id = ?");
    deleteArticlesStmt.run(feedId);
    
    // Delete the feed itself
    const deleteFeedStmt = db.prepare("DELETE FROM feeds WHERE id = ?");
    const result = deleteFeedStmt.run(feedId);
    
    db.exec("COMMIT");
    
    return result.changes > 0;
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Error deleting feed:", error);
    throw error;
  }
}

export async function toggleFeedActive(feedId: string, active: boolean): Promise<boolean> {
  try {
    const stmt = db.prepare("UPDATE feeds SET active = ? WHERE id = ?");
    const result = stmt.run(active ? 1 : 0, feedId);
    return result.changes > 0;
  } catch (error) {
    console.error("Error toggling feed active status:", error);
    throw error;
  }
}

// Article management functions
export async function saveArticle(
  article: Omit<Article, "id" | "discoveredAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  const discoveredAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO articles (id, feed_id, title, link, description, content, pub_date, discovered_at, processed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const result = stmt.run(
      id,
      article.feedId,
      article.title,
      article.link,
      article.description || null,
      article.content || null,
      article.pubDate,
      discoveredAt,
      article.processed ? 1 : 0,
    );

    // Return existing ID if article already exists
    if (result.changes === 0) {
      const existing = db
        .prepare("SELECT id FROM articles WHERE link = ?")
        .get(article.link) as any;
      return existing?.id || id;
    }

    return id;
  } catch (error) {
    console.error("Error saving article:", error);
    throw error;
  }
}

export async function getUnprocessedArticles(
  limit?: number,
): Promise<Article[]> {
  try {
    const sql = `
      SELECT *
      FROM articles
      WHERE processed = 0
        AND pub_date >= datetime('now','-6 hours')
      ORDER BY pub_date DESC
      ${limit ? `LIMIT ${limit}` : ""}
    `;
    const stmt = db.prepare(sql);
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      feedId: row.feed_id,
      title: row.title,
      link: row.link,
      description: row.description,
      content: row.content,
      pubDate: row.pub_date,
      discoveredAt: row.discovered_at,
      processed: Boolean(row.processed),
    }));
  } catch (error) {
    console.error("Error getting unprocessed articles:", error);
    throw error;
  }
}

export async function markArticleAsProcessed(articleId: string): Promise<void> {
  try {
    const stmt = db.prepare("UPDATE articles SET processed = 1 WHERE id = ?");
    stmt.run(articleId);
  } catch (error) {
    console.error("Error marking article as processed:", error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function markAsProcessed(
  feedUrl: string,
  itemId: string,
): Promise<boolean> {
  if (!feedUrl || !itemId) {
    throw new Error("feedUrl and itemId are required");
  }

  try {
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
  } catch (error) {
    console.error("Error marking item as processed:", error);
    throw error;
  }
}

// Episode management functions
export async function saveEpisode(
  episode: Omit<Episode, "id" | "createdAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (!episode.articleId || !episode.title || !episode.audioPath) {
    throw new Error("articleId, title, and audioPath are required");
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO episodes (id, article_id, title, description, audio_path, duration, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    stmt.run(
      id,
      episode.articleId,
      episode.title,
      episode.description || null,
      episode.audioPath,
      episode.duration || null,
      episode.fileSize || null,
      createdAt,
    );
    return id;
  } catch (error) {
    console.error("Error saving episode:", error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function saveLegacyEpisode(ep: LegacyEpisode): Promise<void> {
  if (!ep.id || !ep.title || !ep.pubDate || !ep.audioPath || !ep.sourceLink) {
    throw new Error("All episode fields are required");
  }

  try {
    // For now, save to a temporary table for migration
    const stmt = db.prepare(
      "CREATE TABLE IF NOT EXISTS legacy_episodes (id TEXT PRIMARY KEY, title TEXT, pubDate TEXT, audioPath TEXT, sourceLink TEXT)",
    );
    stmt.run();

    const insert = db.prepare(
      "INSERT OR IGNORE INTO legacy_episodes (id, title, pubDate, audioPath, sourceLink) VALUES (?, ?, ?, ?, ?)",
    );
    insert.run(ep.id, ep.title, ep.pubDate, ep.audioPath, ep.sourceLink);
  } catch (error) {
    console.error("Error saving legacy episode:", error);
    throw error;
  }
}

export async function fetchAllEpisodes(): Promise<Episode[]> {
  try {
    const stmt = db.prepare(`
      SELECT 
        e.id,
        e.article_id as articleId,
        e.title,
        e.description,
        e.audio_path as audioPath,
        e.duration,
        e.file_size as fileSize,
        e.created_at as createdAt
      FROM episodes e
      ORDER BY e.created_at DESC
    `);
    return stmt.all() as Episode[];
  } catch (error) {
    console.error("Error fetching episodes:", error);
    throw error;
  }
}

export async function fetchEpisodesWithArticles(): Promise<
  (Episode & { article: Article; feed: Feed })[]
> {
  try {
    const stmt = db.prepare(`
      SELECT 
        e.id,
        e.article_id as articleId,
        e.title,
        e.description,
        e.audio_path as audioPath,
        e.duration,
        e.file_size as fileSize,
        e.created_at as createdAt,
        a.id as article_id,
        a.feed_id as article_feedId,
        a.title as article_title,
        a.link as article_link,
        a.description as article_description,
        a.content as article_content,
        a.pub_date as article_pubDate,
        a.discovered_at as article_discoveredAt,
        a.processed as article_processed,
        f.id as feed_id,
        f.url as feed_url,
        f.title as feed_title,
        f.description as feed_description,
        f.last_updated as feed_lastUpdated,
        f.created_at as feed_createdAt,
        f.active as feed_active
      FROM episodes e
      JOIN articles a ON e.article_id = a.id
      JOIN feeds f ON a.feed_id = f.id
      ORDER BY e.created_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      articleId: row.articleId,
      title: row.title,
      description: row.description,
      audioPath: row.audioPath,
      duration: row.duration,
      fileSize: row.fileSize,
      createdAt: row.createdAt,
      article: {
        id: row.article_id,
        feedId: row.article_feedId,
        title: row.article_title,
        link: row.article_link,
        description: row.article_description,
        content: row.article_content,
        pubDate: row.article_pubDate,
        discoveredAt: row.article_discoveredAt,
        processed: Boolean(row.article_processed),
      },
      feed: {
        id: row.feed_id,
        url: row.feed_url,
        title: row.feed_title,
        description: row.feed_description,
        lastUpdated: row.feed_lastUpdated,
        createdAt: row.feed_createdAt,
        active: Boolean(row.feed_active),
      },
    }));
  } catch (error) {
    console.error("Error fetching episodes with articles:", error);
    throw error;
  }
}

// TTS Queue management functions
export interface TTSQueueItem {
  id: string;
  itemId: string;
  scriptText: string;
  retryCount: number;
  createdAt: string;
  lastAttemptedAt?: string;
  status: 'pending' | 'processing' | 'failed';
}

export async function addToQueue(
  itemId: string,
  scriptText: string,
  retryCount: number = 0,
): Promise<string> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT INTO tts_queue (id, item_id, script_text, retry_count, created_at, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    );
    stmt.run(id, itemId, scriptText, retryCount, createdAt);
    console.log(`TTS queue に追加: ${itemId} (試行回数: ${retryCount})`);
    return id;
  } catch (error) {
    console.error("Error adding to TTS queue:", error);
    throw error;
  }
}

export async function getQueueItems(limit: number = 10): Promise<TTSQueueItem[]> {
  try {
    const stmt = db.prepare(`
      SELECT * FROM tts_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      scriptText: row.script_text,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      lastAttemptedAt: row.last_attempted_at,
      status: row.status,
    }));
  } catch (error) {
    console.error("Error getting queue items:", error);
    throw error;
  }
}

export async function updateQueueItemStatus(
  queueId: string,
  status: 'pending' | 'processing' | 'failed',
  lastAttemptedAt?: string,
): Promise<void> {
  try {
    const stmt = db.prepare(
      "UPDATE tts_queue SET status = ?, last_attempted_at = ? WHERE id = ?",
    );
    stmt.run(status, lastAttemptedAt || new Date().toISOString(), queueId);
  } catch (error) {
    console.error("Error updating queue item status:", error);
    throw error;
  }
}

export async function removeFromQueue(queueId: string): Promise<void> {
  try {
    const stmt = db.prepare("DELETE FROM tts_queue WHERE id = ?");
    stmt.run(queueId);
  } catch (error) {
    console.error("Error removing from queue:", error);
    throw error;
  }
}

// Feed Request management functions
export interface FeedRequest {
  id: string;
  url: string;
  requestedBy?: string;
  requestMessage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

export async function submitFeedRequest(
  request: Omit<FeedRequest, "id" | "createdAt" | "status">
): Promise<string> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT INTO feed_requests (id, url, requested_by, request_message, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    );
    stmt.run(id, request.url, request.requestedBy || null, request.requestMessage || null, createdAt);
    console.log(`Feed request submitted: ${request.url}`);
    return id;
  } catch (error) {
    console.error("Error submitting feed request:", error);
    throw error;
  }
}

export async function getFeedRequests(status?: string): Promise<FeedRequest[]> {
  try {
    const sql = status
      ? "SELECT * FROM feed_requests WHERE status = ? ORDER BY created_at DESC"
      : "SELECT * FROM feed_requests ORDER BY created_at DESC";
    
    const stmt = db.prepare(sql);
    const rows = status ? stmt.all(status) : stmt.all();

    return (rows as any[]).map((row) => ({
      id: row.id,
      url: row.url,
      requestedBy: row.requested_by,
      requestMessage: row.request_message,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      adminNotes: row.admin_notes,
    }));
  } catch (error) {
    console.error("Error getting feed requests:", error);
    throw error;
  }
}

export async function updateFeedRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy?: string,
  adminNotes?: string,
): Promise<boolean> {
  try {
    const reviewedAt = new Date().toISOString();
    const stmt = db.prepare(
      "UPDATE feed_requests SET status = ?, reviewed_at = ?, reviewed_by = ?, admin_notes = ? WHERE id = ?",
    );
    const result = stmt.run(status, reviewedAt, reviewedBy || null, adminNotes || null, requestId);
    return result.changes > 0;
  } catch (error) {
    console.error("Error updating feed request status:", error);
    throw error;
  }
}

export function closeDatabase(): void {
  db.close();
}
