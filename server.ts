import { serve } from "bun";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import Router from "bun-router";

const db = new Database("./data/podcast.db");
db.exec(fs.readFileSync("./schema.sql", "utf-8"));

const router = new Router();

router.get("/api/feeds", (ctx) => {
  const rows = db.prepare("SELECT feed_url FROM processed_feed_items GROUP BY feed_url").all();
  return new Response(JSON.stringify(rows.map(r => r.feed_url)), { status: 200 });
});

router.post("/api/feeds", async (ctx) => {
  const { feedUrl }: { feedUrl: string } = await ctx.json();
  return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
});

router.get("/api/episodes", (ctx) => {
  const episodes = db.prepare("SELECT * FROM episodes ORDER BY pubDate DESC").all();
  return new Response(JSON.stringify(episodes), { status: 200 });
});

router.post("/api/episodes/:id/regenerate", (ctx) => {
  const { id } = ctx.params;
  return new Response(JSON.stringify({ result: `Regeneration requested for \${id}` }), { status: 200 });
});

router.get("/*", (ctx) => {
  const filePath = path.join(__dirname, "public", ctx.request.url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return new Response(fs.readFileSync(filePath), { status: 200 });
  }
  return new Response(fs.readFileSync(path.join(__dirname, "public", "index.html")), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
});

serve({
  port: 3000,
  fetch: router.fetch,
});

console.log("Server is running on http://localhost:3000");
