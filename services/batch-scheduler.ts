import { batchProcess } from "../scripts/fetch_and_generate.js";
import { config } from "./config.js";

interface BatchSchedulerState {
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  isRunning: boolean;
  intervalId?: NodeJS.Timeout;
  canForceStop: boolean;
}

class BatchScheduler {
  private state: BatchSchedulerState = {
    enabled: true,
    isRunning: false,
    canForceStop: false,
  };
  
  private currentAbortController?: AbortController;

  private readonly SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  constructor() {
    // Check if initial run is disabled via environment variable
    if (config.batch.disableInitialRun) {
      console.log("⏸️  Initial batch run disabled by configuration");
      // Still schedule regular runs, just skip the initial one
      this.scheduleRegularRuns();
    } else {
      // Start with initial delay and then schedule regular runs
      this.scheduleInitialRun();
    }
  }

  private scheduleInitialRun() {
    setTimeout(async () => {
      if (this.state.enabled) {
        await this.runBatch();
      }
      if (this.state.enabled) {
        this.scheduleRegularRuns();
      }
    }, 10000); // Wait 10 seconds after startup
  }

  private scheduleRegularRuns() {
    if (this.state.intervalId) {
      clearTimeout(this.state.intervalId);
    }

    if (!this.state.enabled) {
      this.state.nextRun = undefined;
      return;
    }

    const nextRunTime = Date.now() + this.SIX_HOURS_MS;
    this.state.nextRun = new Date(nextRunTime).toISOString();

    console.log(
      `🕕 Next batch process scheduled for: ${new Date(nextRunTime).toLocaleString()}`
    );

    this.state.intervalId = setTimeout(async () => {
      if (this.state.enabled) {
        await this.runBatch();
        this.scheduleRegularRuns(); // Schedule next run
      }
    }, this.SIX_HOURS_MS);
  }

  private async runBatch(): Promise<void> {
    if (this.state.isRunning) {
      console.log("⚠️  Batch process already running, skipping");
      return;
    }

    this.state.isRunning = true;
    this.state.canForceStop = true;
    this.state.lastRun = new Date().toISOString();
    
    // Create new AbortController for this batch run
    this.currentAbortController = new AbortController();

    try {
      console.log("🔄 Running scheduled batch process...");
      await batchProcess(this.currentAbortController.signal);
      console.log("✅ Scheduled batch process completed");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("🛑 Batch process was forcefully stopped");
      } else {
        console.error("❌ Error during scheduled batch process:", error);
      }
    } finally {
      this.state.isRunning = false;
      this.state.canForceStop = false;
      this.currentAbortController = undefined;
    }
  }

  public async triggerManualRun(): Promise<void> {
    console.log("🚀 Manual batch process triggered");
    await this.runBatch();
  }

  public enable(): void {
    if (this.state.enabled) {
      console.log("ℹ️  Batch scheduler already enabled");
      return;
    }

    this.state.enabled = true;
    console.log("✅ Batch scheduler enabled");
    this.scheduleRegularRuns();
  }

  public disable(): void {
    if (!this.state.enabled) {
      console.log("ℹ️  Batch scheduler already disabled");
      return;
    }

    this.state.enabled = false;
    console.log("⏸️  Batch scheduler disabled");

    if (this.state.intervalId) {
      clearTimeout(this.state.intervalId);
      this.state.intervalId = undefined;
    }

    this.state.nextRun = undefined;
  }

  public getStatus(): BatchSchedulerState {
    return {
      ...this.state,
      intervalId: undefined, // Don't expose the timeout ID
    };
  }

  public forceStop(): boolean {
    if (!this.state.isRunning || !this.currentAbortController) {
      console.log("ℹ️  No batch process currently running to stop");
      return false;
    }

    console.log("🛑 Force stopping batch process...");
    this.currentAbortController.abort();
    return true;
  }

  public isEnabled(): boolean {
    return this.state.enabled;
  }

  public isRunning(): boolean {
    return this.state.isRunning;
  }
}

// Export singleton instance
export const batchScheduler = new BatchScheduler();

export type { BatchSchedulerState };