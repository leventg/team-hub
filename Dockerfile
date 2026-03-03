# ============================================================
# Stage 1: Build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --ignore-scripts

# Copy source
COPY apps/api/ apps/api/
COPY apps/web/ apps/web/

# Build API
RUN npm run build -w apps/api

# Build Web
RUN npm run build -w apps/web

# ============================================================
# Stage 2: Production
# ============================================================
FROM node:22-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built API
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# Copy built Web (static files to be served)
COPY --from=builder /app/apps/web/dist ./public

# Install production deps only
COPY --from=builder /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Non-root user
RUN addgroup -g 1001 teamhub && adduser -u 1001 -G teamhub -s /bin/sh -D teamhub
USER teamhub

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/team-hub/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
