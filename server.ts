import { Hono } from "hono";
import { serve } from "@hono/node-server";
import path from "path";
import { config, validateConfig } from "./services/config.js";
import { 
  fetchAllEpisodes, 
  fetchEpisodesWithArticles,
  getAllFeeds,
  getFeedByUrl
} from "./services/database.js";
import { batchProcess, addNewFeedUrl } from "./scripts/fetch_and_generate.js";

// Validate configuration on startup
try {
  validateConfig();
  console.log("Configuration validated successfully");
} catch (error) {
  console.error("Configuration validation failed:", error);
  process.exit(1);
}

const app = new Hono();

// API routes
app.get("/api/feeds", async (c) => {
  try {
    const feeds = await getAllFeeds();
    return c.json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return c.json({ error: "Failed to fetch feeds" }, 500);
  }
});

app.post("/api/feeds", async (c) => {
  try {
    const { feedUrl } = await c.req.json<{ feedUrl: string }>();
    
    if (!feedUrl || typeof feedUrl !== "string" || !feedUrl.startsWith('http')) {
      return c.json({ error: "Valid feed URL is required" }, 400);
    }
    
    console.log("➕ Adding new feed URL:", feedUrl);
    
    // Check if feed already exists
    const existingFeed = await getFeedByUrl(feedUrl);
    if (existingFeed) {
      return c.json({ 
        result: "EXISTS", 
        message: "Feed URL already exists",
        feed: existingFeed 
      });
    }
    
    // Add new feed
    await addNewFeedUrl(feedUrl);
    
    return c.json({ 
      result: "CREATED", 
      message: "Feed URL added successfully",
      feedUrl 
    });
  } catch (error) {
    console.error("Error adding feed:", error);
    return c.json({ error: "Failed to add feed" }, 500);
  }
});

app.get("/api/episodes", async (c) => {
  try {
    const episodes = await fetchEpisodesWithArticles();
    return c.json(episodes);
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return c.json({ error: "Failed to fetch episodes" }, 500);
  }
});

app.get("/api/episodes/simple", async (c) => {
  try {
    const episodes = await fetchAllEpisodes();
    return c.json(episodes);
  } catch (error) {
    console.error("Error fetching simple episodes:", error);
    return c.json({ error: "Failed to fetch episodes" }, 500);
  }
});

app.post("/api/episodes/:id/regenerate", async (c) => {
  try {
    const id = c.req.param("id");
    
    if (!id || id.trim() === "") {
      return c.json({ error: "Episode ID is required" }, 400);
    }
    
    console.log("🔄 Regeneration requested for episode ID:", id);
    // TODO: Implement regeneration logic
    return c.json({ 
      result: "PENDING", 
      episodeId: id,
      status: "pending",
      message: "Regeneration feature will be implemented in a future update"
    });
  } catch (error) {
    console.error("Error requesting regeneration:", error);
    return c.json({ error: "Failed to request regeneration" }, 500);
  }
});

// New API endpoints for enhanced functionality
app.get("/api/stats", async (c) => {
  try {
    const feeds = await getAllFeeds();
    const episodes = await fetchAllEpisodes();
    
    const stats = {
      totalFeeds: feeds.length,
      activeFeeds: feeds.filter(f => f.active).length,
      totalEpisodes: episodes.length,
      lastUpdated: new Date().toISOString()
    };
    
    return c.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

app.post("/api/batch/trigger", async (c) => {
  try {
    console.log("🚀 Manual batch process triggered via API");
    
    // Run batch process in background
    runBatchProcess().catch(error => {
      console.error("❌ Manual batch process failed:", error);
    });
    
    return c.json({ 
      result: "TRIGGERED",
      message: "Batch process started in background",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error triggering batch process:", error);
    return c.json({ error: "Failed to trigger batch process" }, 500);
  }
});

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

// Legacy endpoint - redirect to new one
app.post("/api/add-feed", async (c) => {
  return c.json({ 
    error: "This endpoint is deprecated. Use POST /api/feeds instead.",
    newEndpoint: "POST /api/feeds"
  }, 410);
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
