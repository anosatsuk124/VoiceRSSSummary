# Use the official bun image as a base
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Create a volume for the working directory
VOLUME /app

# Copy project files
COPY . .

# Install dependencies
RUN bun install

RUN bun run build:frontend
RUN bun run build:admin

# Expose the ports your app runs on
EXPOSE 3000 3001

# Start both servers
CMD ["sh", "-c", "bun run /app/server.ts & bun run /app/admin-server.ts & wait"]
