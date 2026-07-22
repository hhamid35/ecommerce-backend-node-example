# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# ---- Dependencies ----
# Install only production dependencies in a cached layer.
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM base AS runtime

# Install curl for the container HEALTHCHECK.
RUN apk add --no-cache curl

# Copy installed dependencies and application source.
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Ensure the uploads directory exists and is writable by the app user.
RUN mkdir -p public/uploads \
  && chown -R node:node /usr/src/app

# Run as the built-in non-root "node" user.
USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3002}/health || exit 1

CMD ["node", "src/server.js"]
