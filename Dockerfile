# Multi-stage build for production-ready frontend

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Runtime
FROM alpine:3.19

# Install static-web-server (Rust-based, high performance)
RUN apk add --no-cache static-web-server

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

WORKDIR /app

# Copy built assets from builder
COPY --from=builder --chown=appuser:appuser /app/dist ./dist

# Copy env injection script
COPY --chown=appuser:appuser docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user
USER appuser

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["static-web-server", "-p", "8080", "-d", "dist", "--page-fallback", "dist/index.html"]
