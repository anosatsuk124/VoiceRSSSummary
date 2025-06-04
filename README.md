# Voice RSS Summary

Voice RSS Summary automatically collects RSS feeds, summarizes new articles using OpenAI, and publishes them as a podcast with speech synthesized by VOICEVOX. The project uses the Bun runtime with a React (Vite) front end and an SQLite database.

## Features

- Fetch multiple RSS feeds listed in `feed_urls.txt`.
- Generate podcast scripts with the OpenAI API.
- Convert scripts to audio using VOICEVOX and FFmpeg.
- Serve a web interface to browse feeds and play episodes.
- Provide a podcast RSS feed at `/podcast.xml`.

## Prerequisites

- [Bun](https://bun.sh/) 1.x (if running locally)
- VOICEVOX engine
- An OpenAI API key

## Installation

1. Install dependencies:

   ```bash
   bun install
   ```

2. Build the front end:

   ```bash
   bun run build:frontend
   ```

3. Create a `.env` file and set the following variables:

   ```env
   OPENAI_API_KEY=your-api-key
   OPENAI_API_ENDPOINT=https://api.openai.com/v1
   OPENAI_MODEL_NAME=gpt-4o-mini
   VOICEVOX_HOST=http://localhost:50021
   VOICEVOX_STYLE_ID=0
   PODCAST_TITLE=Voice RSS Summary
   PODCAST_LINK=https://your-domain.com/podcast
   PODCAST_DESCRIPTION=Generated podcast feed
   PODCAST_LANGUAGE=ja
   PODCAST_AUTHOR=Admin
   PODCAST_CATEGORIES=Technology
   PODCAST_TTL=60
   PODCAST_BASE_URL=https://your-domain.com
   FEED_URLS_FILE=feed_urls.txt
   ```

4. Prepare `feed_urls.txt` with one RSS feed URL per line.

5. Start the server:

   ```bash
   bun run server.ts
   ```

The initial batch process runs on start and then every 24 hours.

## Docker

A Dockerfile and helper scripts are provided. To run in a container:

```bash
./build-docker-image.sh
./run-docker.sh
```

These scripts mount `feed_urls.txt`, `.env`, `public/`, and `data/` for persistence.

## Directories

- `data/` – SQLite database (`podcast.db`)
- `public/podcast_audio/` – generated MP3 files
- `frontend/` – Vite React application (served on build)

Access the web UI and podcast feed on `http://localhost:3000/` after the server starts.

## License

This project is licensed under the [Apache 2.0 License](LICENSE).
