import { Hono } from "hono";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { Database } from "bun:sqlite";

const projectRoot = import.meta.dirname;

// データベースパスの設定
const dbPath = path.join(projectRoot, "data/podcast.db");
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const db = new Database(dbPath);
if (!fs.existsSync(dbPath)) {
  fs.closeSync(fs.openSync(dbPath, "w"));
}
db.exec(fs.readFileSync(path.join(projectRoot, "schema.sql"), "utf-8"));

// 静的ファイルパスの設定
const frontendBuildDir = path.join(projectRoot, "frontend", "dist");
const podcastAudioDir = path.join(projectRoot, "public", "podcast_audio");
const generalPublicDir = path.join(projectRoot, "public");

const app = new Hono();

// APIルート（順序を最適化）
app.get("/api/feeds", async (c) => {
  const rows = db
    .query("SELECT feed_url FROM processed_feed_items GROUP BY feed_url")
    .all() as { feed_url: string }[];
  return c.json(rows.map((r) => r.feed_url));
});

app.post("/api/feeds", async (c) => {
  try {
    const { feedUrl } = await c.req.json<{ feedUrl: string }>();
    console.log("Received feedUrl to add:", feedUrl);
    // TODO: feedUrl をデータベースに保存する処理
    return c.json({ result: "OK" });
  } catch (e) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
});

app.get("/api/episodes", (c) => {
  const episodes = db
    .query("SELECT * FROM episodes ORDER BY pubDate DESC")
    .all();
  return c.json(episodes);
});

app.post("/api/episodes/:id/regenerate", (c) => {
  const id = c.req.param("id");
  console.log("Regeneration requested for episode ID:", id);
  // TODO: 再生成ロジックを実装
  return c.json({ result: `Regeneration requested for ${id}` });
});

// 静的ファイルの処理

// Vite ビルドの静的ファイル（main.js, assets/ など）
app.get("/assets/*", async (c) => {
  const filePath = path.join(frontendBuildDir, c.req.path);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    const contentType = filePath.endsWith(".js")
      ? "application/javascript"
      : filePath.endsWith(".css")
        ? "text/css"
        : "application/octet-stream";
    const blob = await file.arrayBuffer();
    return c.body(blob, 200, { "Content-Type": contentType });
  }
  return c.notFound();
});

// podcast_audio
app.get("/podcast_audio/*", async (c) => {
  const audioFileName = c.req.path.substring("/podcast_audio/".length);
  const audioFilePath = path.join(podcastAudioDir, audioFileName);
  const file = Bun.file(audioFilePath);
  if (await file.exists()) {
    const blob = await file.arrayBuffer();
    return c.body(blob, 200, { "Content-Type": "audio/wav" });
  }
  return c.notFound();
});

// podcast.xml
app.get("/podcast.xml", async (c) => {
  const filePath = path.join(generalPublicDir, "podcast.xml");
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, {
        "Content-Type": "application/xml; charset=utf-8",
      });
    }
  } catch (e) {
    console.error(`Error serving podcast.xml ${filePath}:`, e);
  }
  return c.notFound();
});

// フィードURL追加API
app.post("/api/add-feed", async (c) => {
  const { feedUrl } = await c.req.json();
  if (!feedUrl || typeof feedUrl !== "string") {
    return c.json({ error: "フィードURLが無効です" }, 400);
  }

  try {
    // フィードURLを追加するロジック（例: scripts/fetch_and_generate.ts で実装）
    const { addNewFeedUrl } = require("./scripts/fetch_and_generate");
    await addNewFeedUrl(feedUrl);
    return c.json({ message: "フィードが追加されました" });
  } catch (err) {
    console.error("フィード追加エラー:", err);
    return c.json({ error: "フィードの追加に失敗しました" }, 500);
  }
});

// フォールバックとして index.html（ルートパス）
app.get("/", async (c) => {
  const indexPath = path.join(frontendBuildDir, "index.html");
  const file = Bun.file(indexPath);
  if (await file.exists()) {
    console.log(`Serving index.html from ${indexPath}`);
    const blob = await file.arrayBuffer();
    return c.body(blob, 200, { "Content-Type": "text/html; charset=utf-8" });
  }
  console.error(`index.html not found at ${indexPath}`);
  return c.notFound();
});

// フォールバックとして index.html（明示的なパス）
app.get("/index.html", async (c) => {
  const indexPath = path.join(frontendBuildDir, "index.html");
  const file = Bun.file(indexPath);
  if (await file.exists()) {
    console.log(`Serving index.html from ${indexPath}`);
    const blob = await file.arrayBuffer();
    return c.body(blob, 200, { "Content-Type": "text/html; charset=utf-8" });
  }
  console.error(`index.html not found at ${indexPath}`);
  return c.notFound();
});

// その他のパスも index.html へフォールバック
app.get("*", async (c) => {
  const indexPath = path.join(frontendBuildDir, "index.html");
  const file = Bun.file(indexPath);
  if (await file.exists()) {
    console.log(`Serving index.html from ${indexPath}`);
    const blob = await file.arrayBuffer();
    return c.body(blob, 200, { "Content-Type": "text/html; charset=utf-8" });
  }
  console.error(`index.html not found at ${indexPath}`);
  return c.notFound();
});

// サーバー起動
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
