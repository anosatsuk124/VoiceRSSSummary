import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { basicAuth } from "hono/basic-auth";
import path from "path";
import { config, validateConfig } from "./services/config.js";
import { 
  getAllFeedsIncludingInactive,
  deleteFeed,
  toggleFeedActive,
  getFeedByUrl,
  getFeedById,
  fetchAllEpisodes,
  fetchEpisodesWithArticles,
  getFeedRequests,
  updateFeedRequestStatus,
} from "./services/database.js";
import { batchProcess, addNewFeedUrl } from "./scripts/fetch_and_generate.js";
import { batchScheduler } from "./services/batch-scheduler.js";

// Validate configuration on startup
try {
  validateConfig();
  console.log("Admin panel configuration validated successfully");
} catch (error) {
  console.error("Admin panel configuration validation failed:", error);
  process.exit(1);
}

const app = new Hono();

// Basic Authentication middleware (if credentials are provided)
if (config.admin.username && config.admin.password) {
  app.use("*", basicAuth({
    username: config.admin.username,
    password: config.admin.password,
  }));
  console.log("🔐 Admin panel authentication enabled");
} else {
  console.log("⚠️  Admin panel running without authentication");
}

// Environment variables management
app.get("/api/admin/env", async (c) => {
  try {
    const envVars = {
      // OpenAI Configuration
      OPENAI_API_KEY: import.meta.env["OPENAI_API_KEY"] ? "***SET***" : undefined,
      OPENAI_API_ENDPOINT: import.meta.env["OPENAI_API_ENDPOINT"],
      OPENAI_MODEL_NAME: import.meta.env["OPENAI_MODEL_NAME"],
      
      // VOICEVOX Configuration
      VOICEVOX_HOST: import.meta.env["VOICEVOX_HOST"],
      VOICEVOX_STYLE_ID: import.meta.env["VOICEVOX_STYLE_ID"],
      
      // Podcast Configuration
      PODCAST_TITLE: import.meta.env["PODCAST_TITLE"],
      PODCAST_LINK: import.meta.env["PODCAST_LINK"],
      PODCAST_DESCRIPTION: import.meta.env["PODCAST_DESCRIPTION"],
      PODCAST_LANGUAGE: import.meta.env["PODCAST_LANGUAGE"],
      PODCAST_AUTHOR: import.meta.env["PODCAST_AUTHOR"],
      PODCAST_CATEGORIES: import.meta.env["PODCAST_CATEGORIES"],
      PODCAST_TTL: import.meta.env["PODCAST_TTL"],
      PODCAST_BASE_URL: import.meta.env["PODCAST_BASE_URL"],
      
      // Admin Configuration
      ADMIN_PORT: import.meta.env["ADMIN_PORT"],
      ADMIN_USERNAME: import.meta.env["ADMIN_USERNAME"] ? "***SET***" : undefined,
      ADMIN_PASSWORD: import.meta.env["ADMIN_PASSWORD"] ? "***SET***" : undefined,
      
      // File Configuration
      FEED_URLS_FILE: import.meta.env["FEED_URLS_FILE"],
    };
    
    return c.json(envVars);
  } catch (error) {
    console.error("Error fetching environment variables:", error);
    return c.json({ error: "Failed to fetch environment variables" }, 500);
  }
});

// Feed management API endpoints
app.get("/api/admin/feeds", async (c) => {
  try {
    const feeds = await getAllFeedsIncludingInactive();
    return c.json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return c.json({ error: "Failed to fetch feeds" }, 500);
  }
});

app.post("/api/admin/feeds", async (c) => {
  try {
    const { feedUrl } = await c.req.json<{ feedUrl: string }>();
    
    if (!feedUrl || typeof feedUrl !== "string" || !feedUrl.startsWith('http')) {
      return c.json({ error: "Valid feed URL is required" }, 400);
    }
    
    console.log("➕ Admin adding new feed URL:", feedUrl);
    
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

app.delete("/api/admin/feeds/:id", async (c) => {
  try {
    const feedId = c.req.param("id");
    
    if (!feedId || feedId.trim() === "") {
      return c.json({ error: "Feed ID is required" }, 400);
    }
    
    console.log("🗑️  Admin deleting feed ID:", feedId);
    
    const deleted = await deleteFeed(feedId);
    
    if (deleted) {
      return c.json({ 
        result: "DELETED", 
        message: "Feed deleted successfully",
        feedId 
      });
    } else {
      return c.json({ error: "Feed not found" }, 404);
    }
  } catch (error) {
    console.error("Error deleting feed:", error);
    return c.json({ error: "Failed to delete feed" }, 500);
  }
});

app.patch("/api/admin/feeds/:id/toggle", async (c) => {
  try {
    const feedId = c.req.param("id");
    const { active } = await c.req.json<{ active: boolean }>();
    
    if (!feedId || feedId.trim() === "") {
      return c.json({ error: "Feed ID is required" }, 400);
    }
    
    if (typeof active !== "boolean") {
      return c.json({ error: "Active status must be a boolean" }, 400);
    }
    
    console.log(`🔄 Admin toggling feed ${feedId} to ${active ? "active" : "inactive"}`);
    
    const updated = await toggleFeedActive(feedId, active);
    
    if (updated) {
      return c.json({ 
        result: "UPDATED", 
        message: `Feed ${active ? "activated" : "deactivated"} successfully`,
        feedId,
        active
      });
    } else {
      return c.json({ error: "Feed not found" }, 404);
    }
  } catch (error) {
    console.error("Error toggling feed active status:", error);
    return c.json({ error: "Failed to toggle feed status" }, 500);
  }
});

// Episodes management
app.get("/api/admin/episodes", async (c) => {
  try {
    const episodes = await fetchEpisodesWithArticles();
    return c.json(episodes);
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return c.json({ error: "Failed to fetch episodes" }, 500);
  }
});

app.get("/api/admin/episodes/simple", async (c) => {
  try {
    const episodes = await fetchAllEpisodes();
    return c.json(episodes);
  } catch (error) {
    console.error("Error fetching simple episodes:", error);
    return c.json({ error: "Failed to fetch episodes" }, 500);
  }
});

// Feed requests management
app.get("/api/admin/feed-requests", async (c) => {
  try {
    const status = c.req.query("status");
    const requests = await getFeedRequests(status);
    return c.json(requests);
  } catch (error) {
    console.error("Error fetching feed requests:", error);
    return c.json({ error: "Failed to fetch feed requests" }, 500);
  }
});

app.patch("/api/admin/feed-requests/:id/approve", async (c) => {
  try {
    const requestId = c.req.param("id");
    const body = await c.req.json();
    const { adminNotes } = body;
    
    // First get the request to get the URL
    const requests = await getFeedRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      return c.json({ error: "Feed request not found" }, 404);
    }
    
    if (request.status !== 'pending') {
      return c.json({ error: "Feed request already processed" }, 400);
    }
    
    // Add the feed
    await addNewFeedUrl(request.url);
    
    // Update request status
    const updated = await updateFeedRequestStatus(
      requestId, 
      'approved', 
      'admin',
      adminNotes
    );
    
    if (!updated) {
      return c.json({ error: "Failed to update request status" }, 500);
    }
    
    return c.json({ 
      success: true, 
      message: "Feed request approved and feed added successfully" 
    });
  } catch (error) {
    console.error("Error approving feed request:", error);
    return c.json({ error: "Failed to approve feed request" }, 500);
  }
});

app.patch("/api/admin/feed-requests/:id/reject", async (c) => {
  try {
    const requestId = c.req.param("id");
    const body = await c.req.json();
    const { adminNotes } = body;
    
    const updated = await updateFeedRequestStatus(
      requestId, 
      'rejected', 
      'admin',
      adminNotes
    );
    
    if (!updated) {
      return c.json({ error: "Feed request not found" }, 404);
    }
    
    return c.json({ 
      success: true, 
      message: "Feed request rejected successfully" 
    });
  } catch (error) {
    console.error("Error rejecting feed request:", error);
    return c.json({ error: "Failed to reject feed request" }, 500);
  }
});

// Batch scheduler management
app.get("/api/admin/batch/status", async (c) => {
  try {
    const status = batchScheduler.getStatus();
    return c.json(status);
  } catch (error) {
    console.error("Error fetching batch status:", error);
    return c.json({ error: "Failed to fetch batch status" }, 500);
  }
});

app.post("/api/admin/batch/enable", async (c) => {
  try {
    batchScheduler.enable();
    return c.json({ 
      success: true, 
      message: "Batch scheduler enabled successfully",
      status: batchScheduler.getStatus()
    });
  } catch (error) {
    console.error("Error enabling batch scheduler:", error);
    return c.json({ error: "Failed to enable batch scheduler" }, 500);
  }
});

app.post("/api/admin/batch/disable", async (c) => {
  try {
    batchScheduler.disable();
    return c.json({ 
      success: true, 
      message: "Batch scheduler disabled successfully",
      status: batchScheduler.getStatus()
    });
  } catch (error) {
    console.error("Error disabling batch scheduler:", error);
    return c.json({ error: "Failed to disable batch scheduler" }, 500);
  }
});

// System management
app.get("/api/admin/stats", async (c) => {
  try {
    const feeds = await getAllFeedsIncludingInactive();
    const episodes = await fetchAllEpisodes();
    const feedRequests = await getFeedRequests();
    const batchStatus = batchScheduler.getStatus();
    
    const stats = {
      totalFeeds: feeds.length,
      activeFeeds: feeds.filter(f => f.active).length,
      inactiveFeeds: feeds.filter(f => !f.active).length,
      totalEpisodes: episodes.length,
      pendingRequests: feedRequests.filter(r => r.status === 'pending').length,
      totalRequests: feedRequests.length,
      batchScheduler: {
        enabled: batchStatus.enabled,
        isRunning: batchStatus.isRunning,
        lastRun: batchStatus.lastRun,
        nextRun: batchStatus.nextRun,
      },
      lastUpdated: new Date().toISOString(),
      adminPort: config.admin.port,
      authEnabled: !!(config.admin.username && config.admin.password),
    };
    
    return c.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

app.post("/api/admin/batch/trigger", async (c) => {
  try {
    console.log("🚀 Manual batch process triggered via admin panel");
    
    // Use the batch scheduler's manual trigger method
    batchScheduler.triggerManualRun().catch(error => {
      console.error("❌ Manual admin batch process failed:", error);
    });
    
    return c.json({ 
      result: "TRIGGERED",
      message: "Batch process started in background",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error triggering admin batch process:", error);
    return c.json({ error: "Failed to trigger batch process" }, 500);
  }
});

app.post("/api/admin/batch/force-stop", async (c) => {
  try {
    console.log("🛑 Force stop batch process requested via admin panel");
    
    const stopped = batchScheduler.forceStop();
    
    if (stopped) {
      return c.json({ 
        result: "STOPPED",
        message: "Batch process force stop signal sent",
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json({ 
        result: "NO_PROCESS",
        message: "No batch process is currently running",
        timestamp: new Date().toISOString()
      }, 200);
    }
  } catch (error) {
    console.error("Error force stopping batch process:", error);
    return c.json({ error: "Failed to force stop batch process" }, 500);
  }
});

// Static file handlers for admin panel UI
app.get("/assets/*", async (c) => {
  try {
    const filePath = path.join(config.paths.adminBuildDir, c.req.path);
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
    console.error("Error serving admin asset:", error);
    return c.notFound();
  }
});

// Admin panel frontend
async function serveAdminIndex(c: any) {
  try {
    const indexPath = path.join(config.paths.adminBuildDir, "index.html");
    const file = Bun.file(indexPath);
    
    if (await file.exists()) {
      const blob = await file.arrayBuffer();
      return c.body(blob, 200, { "Content-Type": "text/html; charset=utf-8" });
    }
    
    // Fallback to simple HTML if admin panel is not built
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admin Panel</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .error { color: #d32f2f; background: #ffebee; padding: 16px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Admin Panel</h1>
            <div class="error">
              <h3>Admin UI Not Built</h3>
              <p>The admin panel UI has not been built yet.</p>
              <p>For now, you can use the API endpoints directly:</p>
              <ul>
                <li>GET /api/admin/feeds - List all feeds</li>
                <li>POST /api/admin/feeds - Add new feed</li>
                <li>DELETE /api/admin/feeds/:id - Delete feed</li>
                <li>PATCH /api/admin/feeds/:id/toggle - Toggle feed active status</li>
                <li>GET /api/admin/env - View environment variables</li>
                <li>GET /api/admin/stats - View system statistics</li>
                <li>POST /api/admin/batch/trigger - Trigger batch process</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error serving admin index.html:", error);
    return c.text("Internal server error", 500);
  }
}

app.get("/", serveAdminIndex);
app.get("/index.html", serveAdminIndex);
app.get("*", serveAdminIndex);

// Utility functions
async function runBatchProcess(): Promise<void> {
  try {
    await batchProcess();
  } catch (error) {
    console.error("Admin batch process failed:", error);
    throw error;
  }
}

// Start admin server
serve(
  {
    fetch: app.fetch,
    port: config.admin.port,
  },
  (info) => {
    console.log(`🔧 Admin panel running on http://localhost:${info.port}`);
    console.log(`📊 Admin authentication: ${config.admin.username && config.admin.password ? "enabled" : "disabled"}`);
    console.log(`🗄️  Database: ${config.paths.dbPath}`);
  },
);