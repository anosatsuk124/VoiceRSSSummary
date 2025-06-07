import { Hono } from "hono";
import { serve } from "@hono/node-server";
import path from "path";
import { config, validateConfig } from "./services/config.js";
import { batchProcess } from "./scripts/fetch_and_generate.js";

// Validate configuration on startup
try {
  validateConfig();
  console.log("Configuration validated successfully");
} catch (error) {
  console.error("Configuration validation failed:", error);
  process.exit(1);
}

const app = new Hono();

// 静的ファイルの処理

// Static file handlers
app.get("/assets/*", async (c) => {
  try {
    const filePath = path.join(config.paths.frontendBuildDir, c.req.path);
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
  } catch (error) {
    console.error("Error serving asset:", error);
    return c.notFound();
  }
});

app.get("/podcast_audio/*", async (c) => {
  try {
    const audioFileName = c.req.path.substring("/podcast_audio/".length);
    
    // Basic security check
    if (audioFileName.includes("..") || audioFileName.includes("/")) {
      return c.notFound();
    }
    
    const audioFilePath = path.join(config.paths.podcastAudioDir, audioFileName);
    const file = Bun.file(audioFilePath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, { "Content-Type": "audio/mpeg" });
    }
    return c.notFound();
  } catch (error) {
    console.error("Error serving audio file:", error);
    return c.notFound();
  }
});

app.get("/podcast.xml", async (c) => {
  try {
    const filePath = path.join(config.paths.publicDir, "podcast.xml");
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      });
    }
    
    console.warn("podcast.xml not found");
    return c.notFound();
  } catch (error) {
    console.error("Error serving podcast.xml:", error);
    return c.notFound();
  }
});


// Frontend fallback routes
async function serveIndex(c: any) {
  try {
    const indexPath = path.join(config.paths.frontendBuildDir, "index.html");
    const file = Bun.file(indexPath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, { "Content-Type": "text/html; charset=utf-8" });
    }
    
    console.error(`index.html not found at ${indexPath}`);
    return c.text("Frontend not built. Run 'bun run build:frontend'", 404);
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.text("Internal server error", 500);
  }
}

app.get("/", serveIndex);

app.get("/index.html", serveIndex);

// Catch-all for SPA routing
app.get("*", serveIndex);

// Batch processing functions
function scheduleFirstBatchProcess() {
  setTimeout(async () => {
    try {
      console.log("🚀 Running initial batch process...");
      await runBatchProcess();
      console.log("✅ Initial batch process completed");
    } catch (error) {
      console.error("❌ Error during initial batch process:", error);
    }
  }, 10000); // Wait 10 seconds after startup
}

function scheduleSixHourlyBatchProcess() {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  
  console.log(
    `🕕 Next batch process scheduled in 6 hours (${new Date(Date.now() + SIX_HOURS_MS).toLocaleString()})`
  );

  setTimeout(async () => {
    try {
      console.log("🔄 Running scheduled 6-hourly batch process...");
      await runBatchProcess();
      console.log("✅ Scheduled batch process completed");
    } catch (error) {
      console.error("❌ Error during scheduled batch process:", error);
    }
    // Schedule next run
    scheduleSixHourlyBatchProcess();
  }, SIX_HOURS_MS);
}

async function runBatchProcess(): Promise<void> {
  try {
    await batchProcess();
  } catch (error) {
    console.error("Batch process failed:", error);
    throw error;
  }
}

// サーバー起動
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`🌟 Server is running on http://localhost:${info.port}`);
    console.log(`📡 Using configuration from: ${config.paths.projectRoot}`);
    console.log(`🗄️  Database: ${config.paths.dbPath}`);
    
    // Schedule batch processes
    scheduleFirstBatchProcess();
    scheduleSixHourlyBatchProcess();
  },
);
