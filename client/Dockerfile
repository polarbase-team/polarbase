# Stage 1: Build Angular production
FROM node:22-alpine AS builder
WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ .
RUN npx ng build --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist/polarbase-client/browser /usr/share/nginx/html

# Config Nginx for SPA
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80