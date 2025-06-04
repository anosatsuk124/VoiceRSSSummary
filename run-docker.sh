#!/bin/bash

# Run Docker container with volume mounts for feed_urls.txt and .env
docker run \
	--volume "$(pwd)/feed_urls.txt:/app/feed_urls.txt" \
	--volume "$(pwd)/.env:/app/.env" \
	--volume "$(pwd)/public:/app/public" \
	--publish 3000:3000 \
	--name voice-rss-summary \
	\
	voice-rss-summary # --restart always \
