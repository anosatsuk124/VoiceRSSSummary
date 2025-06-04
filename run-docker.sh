#!/bin/bash

# Run Docker container with volume mounts for feed_urls.txt and .env
docker run \
	--volume "$(pwd)/feed_urls.txt:/app/feed_urls.txt" \
	--volume "$(pwd)/.env:/app/.env" \
	--publish 3000:3000 \
	--tty \
	--interactive \
	voice-rss-summary
