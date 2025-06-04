# Use the official bun image as a base
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Create a volume for the working directory
VOLUME /app

# Copy project files
COPY . .

RUN apt update && apt install -y \
    ffmpeg \
    --no-install-recommends

# Install dependencies
RUN bun install

RUN bun run build:frontend

# Expose the port your app runs on
EXPOSE 3000

# Command to run the application
CMD ["bun", "run", "/app/server.ts"]
