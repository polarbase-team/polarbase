# Stage 1: Build Angular production
FROM oven/bun:1 AS builder
WORKDIR /app

# Cache dependencies
COPY client/package.json ./
RUN bun install

COPY client/ .
RUN bun ng build --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist/polarbase-client/browser /usr/share/nginx/html

# Config Nginx for SPA
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80