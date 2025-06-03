import { serve } from "bun";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3"; // @types/better-sqlite3 のインストールを忘れずに

const projectRoot = import.meta.dirname; // server.ts がプロジェクトルートにあると仮定

const db = new Database(path.join(projectRoot, "data/podcast.db"));
db.exec(fs.readFileSync(path.join(projectRoot, "schema.sql"), "utf-8"));

// 静的ファイルを提供するディレクトリのパス設定
// services/tts.ts の出力先は ../static/podcast_audio であり、
// services/podcast.ts の出力先は ../public/podcast.xml であることを考慮
const frontendPublicDir = path.join(projectRoot, "frontend", "public");
const frontendBuildDir = path.join(projectRoot, "frontend", "build"); // Reactアプリのビルド出力先
const podcastAudioDir = path.join(projectRoot, "static", "podcast_audio"); // TTSが音声ファイルを保存する場所
const generalPublicDir = path.join(projectRoot, "public"); // podcast.xml などが置かれる場所

console.log(`Serving frontend static files from: ${frontendPublicDir}`);
console.log(`Serving frontend build artifacts from: ${frontendBuildDir}`);
console.log(`Serving podcast audio from: ${podcastAudioDir}`);
console.log(`Serving general public files (e.g., podcast.xml) from: ${generalPublicDir}`);

serve({
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // API Routes
    if (pathname === "/api/feeds") {
      if (req.method === "GET") {
        const rows = db
          .prepare("SELECT feed_url FROM processed_feed_items GROUP BY feed_url")
          .all() as { feed_url: string }[];
        return new Response(JSON.stringify(rows.map((r) => r.feed_url)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (req.method === "POST") {
        try {
          const { feedUrl }: { feedUrl: string } = await req.json();
          console.log("Received feedUrl to add:", feedUrl);
          // TODO: feedUrl をデータベースに保存する処理
          return new Response(JSON.stringify({ result: "OK" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    if (pathname === "/api/episodes") {
      if (req.method === "GET") {
        const episodes = db
          .prepare("SELECT * FROM episodes ORDER BY pubDate DESC")
          .all();
        return new Response(JSON.stringify(episodes), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (pathname.startsWith("/api/episodes/") && pathname.endsWith("/regenerate")) {
      if (req.method === "POST") {
        const parts = pathname.split('/');
        const id = parts[3];
        console.log("Regeneration requested for episode ID:", id);
        // TODO: 再生成ロジックを実装
        return new Response(
          JSON.stringify({ result: `Regeneration requested for ${id}` }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
    }
    
    // Serve /build/* from frontend/build (compiled JS/CSS)
    if (pathname.startsWith("/build/")) {
        const assetPath = pathname.substring("/build/".length);
        const filePath = path.join(frontendBuildDir, assetPath);
        try {
            const file = Bun.file(filePath);
            if (await file.exists()) {
                let contentType = "application/octet-stream";
                if (filePath.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
                else if (filePath.endsWith(".css")) contentType = "text/css; charset=utf-8";
                // 必要に応じて他のMIMEタイプを追加
                return new Response(file, { headers: { "Content-Type": contentType } });
            }
        } catch (e) {
            console.error(`Error serving file from frontend build dir ${filePath}:`, e);
        }
    }

    // Serve /podcast_audio/* from static/podcast_audio
    if (pathname.startsWith("/podcast_audio/")) {
        const audioFileName = pathname.substring("/podcast_audio/".length);
        const audioFilePath = path.join(podcastAudioDir, audioFileName);
        try {
            const file = Bun.file(audioFilePath);
            if (await file.exists()) {
                return new Response(file, { headers: { "Content-Type": "audio/mpeg" } });
            }
        } catch (e) {
            console.error(`Error serving audio file ${audioFilePath}:`, e);
        }
    }

    // Serve /podcast.xml from generalPublicDir (project_root/public/podcast.xml)
    if (pathname === "/podcast.xml") {
        const filePath = path.join(generalPublicDir, "podcast.xml");
        try {
            const file = Bun.file(filePath);
            if (await file.exists()) {
                return new Response(file, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
            }
        } catch (e) {
            console.error(`Error serving podcast.xml ${filePath}:`, e);
        }
    }

    // Serve static files from frontend/public (e.g., favicon.ico, manifest.json)
    // Note: index.html is handled by SPA fallback primarily, but direct access could be supported here.
    // We avoid serving index.html here directly to let SPA fallback handle it for cleaner URLs.
    if (pathname !== "/" && pathname !== "/index.html") { // Avoid double serving index.html
        const publicAssetPath = path.join(frontendPublicDir, pathname.startsWith("/") ? pathname.substring(1) : pathname);
        try {
            const file = Bun.file(publicAssetPath);
            if (await file.exists() && !fs.statSync(publicAssetPath).isDirectory()) { // Ensure it's a file
                let contentType = "application/octet-stream";
                if (publicAssetPath.endsWith(".css")) contentType = "text/css; charset=utf-8";
                else if (publicAssetPath.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
                else if (publicAssetPath.endsWith(".json")) contentType = "application/json; charset=utf-8";
                else if (publicAssetPath.endsWith(".png")) contentType = "image/png";
                else if (publicAssetPath.endsWith(".jpg") || publicAssetPath.endsWith(".jpeg")) contentType = "image/jpeg";
                else if (publicAssetPath.endsWith(".ico")) contentType = "image/x-icon";
                // 他の静的アセットタイプをここに追加
                return new Response(file, { headers: { "Content-Type": contentType } });
            }
        } catch (e) {
            // Not found or other error, fall through to SPA fallback or 404
        }
    }
    
    // SPA Fallback: For non-API, non-file paths, serve frontend/public/index.html
    // This handles requests like `/`, `/some-route` for client-side routing.
    const indexHtmlPath = path.join(frontendPublicDir, "index.html");
    try {
        const indexFile = Bun.file(indexHtmlPath);
        if (await indexFile.exists()) {
            return new Response(indexFile, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
    } catch (e) {
        console.error(`Error serving index.html ${indexHtmlPath}:`, e);
    }

    return new Response("Not Found", { status: 404 });
  },
  error(error: Error): Response {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log("Server is running on http://localhost:3000");
