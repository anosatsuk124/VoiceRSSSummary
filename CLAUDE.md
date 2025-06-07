# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- **Install dependencies**: `bun install`
- **Build frontend**: `bun run build:frontend`
- **Build admin panel**: `bun run build:admin`
- **Start server**: `bun run start` or `bun run server.ts`
- **Start admin panel**: `bun run admin` or `bun run admin-server.ts`
- **Frontend development**: `bun run dev:frontend`
- **Admin panel development**: `bun run dev:admin`
- **Manual batch process**: `bun run scripts/fetch_and_generate.ts`
- **Type checking**: `bunx tsc --noEmit`

## Architecture Overview

This is a RSS-to-podcast automation system built with Bun runtime, Hono web framework, React frontend, and SQLite database.

### Core Components

- **server.ts**: Main Hono web server serving UI and static content (port 3000)
- **admin-server.ts**: Admin panel server for management functions (port 3001 by default)
- **scripts/fetch_and_generate.ts**: Batch processing script that fetches RSS feeds, generates summaries, and creates audio files
- **services/**: Core business logic modules:
  - `config.ts`: Centralized configuration management with validation
  - `database.ts`: SQLite operations for episodes and feed tracking (includes feed deletion)
  - `llm.ts`: OpenAI integration for content generation and feed classification
  - `tts.ts`: Text-to-speech via VOICEVOX API
  - `podcast.ts`: RSS feed generation
- **frontend/**: Vite React SPA for browsing feeds and episodes

### Data Flow

1. RSS feeds listed in `feed_urls.txt` are processed daily
2. Latest articles are classified by category and summarized via OpenAI
3. Summaries are converted to audio using VOICEVOX
4. Episodes are stored in SQLite (`data/podcast.db`) with audio files in `public/podcast_audio/`
5. RSS feed is generated at `/podcast.xml` for podcast clients
6. Web UI serves the React frontend for browsing content

### Key Directories

- `data/`: SQLite database storage
- `public/podcast_audio/`: Generated MP3 files
- `frontend/dist/`: Built React application (served statically)

### Environment Configuration

The application uses `services/config.ts` for centralized configuration management. Required `.env` variables include:
- `OPENAI_API_KEY`: OpenAI API key (required)
- `VOICEVOX_HOST`: VOICEVOX server URL (default: http://localhost:50021)
- `VOICEVOX_STYLE_ID`: Voice style ID (default: 0)
- `ADMIN_PORT`: Admin panel port (default: 3001)
- `ADMIN_USERNAME`: Admin panel username (optional, for basic auth)
- `ADMIN_PASSWORD`: Admin panel password (optional, for basic auth)
- Podcast metadata and other optional settings

Configuration is validated on startup. See README.md for complete list.

### Deployment

The application runs as two separate servers:
- **Main server (port 3000)**: Serves the web UI, podcast.xml, and static files
- **Admin server (port 3001)**: Provides management interface with feed CRUD operations and environment variable management

Both servers execute batch processing on startup and at regular intervals.

### Recent Improvements

- **Admin Panel**: Separate admin server with feed management, deletion, and environment variable configuration
- **Feed Management**: Added feed deletion functionality and active/inactive toggling
- **API Separation**: Moved all management APIs to admin server, keeping main server focused on content delivery
- **ES Module Compatibility**: Fixed all ES module issues and removed deprecated `__dirname` usage
- **Centralized Configuration**: Added `services/config.ts` for type-safe configuration management
- **Enhanced Error Handling**: Improved error handling and validation throughout the codebase
- **Type Safety**: Fixed TypeScript errors and added proper null checks
- **Code Structure**: Simplified RSS generation logic and removed code duplication
- **Path Resolution**: Standardized path handling using the config module