# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Cache dependencies
COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY server/ .

# Expose port
EXPOSE 3000

# Run server
CMD ["bun", "src/index.ts"]