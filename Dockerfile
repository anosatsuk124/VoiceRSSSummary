# Use the official bun image as a base
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN bun install

# Expose the port your app runs on
EXPOSE 3000

# Command to run the application
CMD ["bun", "run", "server.ts"]
