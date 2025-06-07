import path from "path";

interface Config {
  // OpenAI Configuration
  openai: {
    apiKey: string;
    endpoint: string;
    modelName: string;
  };
  
  // VOICEVOX Configuration
  voicevox: {
    host: string;
    styleId: number;
  };
  
  // Podcast Configuration
  podcast: {
    title: string;
    link: string;
    description: string;
    language: string;
    author: string;
    categories: string;
    ttl: string;
    baseUrl: string;
  };
  
  // Admin Panel Configuration
  admin: {
    port: number;
    username?: string;
    password?: string;
  };
  
  // Batch Processing Configuration
  batch: {
    disableInitialRun: boolean;
  };
  
  // File paths
  paths: {
    projectRoot: string;
    dataDir: string;
    dbPath: string;
    publicDir: string;
    podcastAudioDir: string;
    frontendBuildDir: string;
    adminBuildDir: string;
    feedUrlsFile: string;
  };
}

function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return import.meta.env[key] ?? defaultValue;
}

function createConfig(): Config {
  const projectRoot = import.meta.dirname ? path.dirname(import.meta.dirname) : process.cwd();
  const dataDir = path.join(projectRoot, "data");
  const publicDir = path.join(projectRoot, "public");
  
  return {
    openai: {
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
      endpoint: getOptionalEnv("OPENAI_API_ENDPOINT", "https://api.openai.com/v1"),
      modelName: getOptionalEnv("OPENAI_MODEL_NAME", "gpt-4o-mini"),
    },
    
    voicevox: {
      host: getOptionalEnv("VOICEVOX_HOST", "http://localhost:50021"),
      styleId: parseInt(getOptionalEnv("VOICEVOX_STYLE_ID", "0")),
    },
    
    podcast: {
      title: getOptionalEnv("PODCAST_TITLE", "自動生成ポッドキャスト"),
      link: getOptionalEnv("PODCAST_LINK", "https://your-domain.com/podcast"),
      description: getOptionalEnv("PODCAST_DESCRIPTION", "RSSフィードから自動生成された音声ポッドキャスト"),
      language: getOptionalEnv("PODCAST_LANGUAGE", "ja"),
      author: getOptionalEnv("PODCAST_AUTHOR", "管理者"),
      categories: getOptionalEnv("PODCAST_CATEGORIES", "Technology"),
      ttl: getOptionalEnv("PODCAST_TTL", "60"),
      baseUrl: getOptionalEnv("PODCAST_BASE_URL", "https://your-domain.com"),
    },
    
    admin: {
      port: parseInt(getOptionalEnv("ADMIN_PORT", "3001")),
      username: import.meta.env["ADMIN_USERNAME"],
      password: import.meta.env["ADMIN_PASSWORD"],
    },
    
    batch: {
      disableInitialRun: getOptionalEnv("DISABLE_INITIAL_BATCH", "false") === "true",
    },
    
    paths: {
      projectRoot,
      dataDir,
      dbPath: path.join(dataDir, "podcast.db"),
      publicDir,
      podcastAudioDir: path.join(publicDir, "podcast_audio"),
      frontendBuildDir: path.join(projectRoot, "frontend", "dist"),
      adminBuildDir: path.join(projectRoot, "admin-panel", "dist"),
      feedUrlsFile: path.join(projectRoot, getOptionalEnv("FEED_URLS_FILE", "feed_urls.txt")),
    },
  };
}

export const config = createConfig();

export function validateConfig(): void {
  // Validate required configuration
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  
  if (isNaN(config.voicevox.styleId)) {
    throw new Error("VOICEVOX_STYLE_ID must be a valid number");
  }
  
  // Validate URLs
  try {
    new URL(config.voicevox.host);
  } catch {
    throw new Error("VOICEVOX_HOST must be a valid URL");
  }
  
  try {
    new URL(config.openai.endpoint);
  } catch {
    throw new Error("OPENAI_API_ENDPOINT must be a valid URL");
  }
}