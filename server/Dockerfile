# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Cache dependencies
COPY server/package.json ./
RUN bun install

# Copy source code
COPY server/ .

# Expose port
EXPOSE 3000

# Run server
CMD ["bun", "src/index.ts"]