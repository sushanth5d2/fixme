# ── Build Stage ────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json turbo.json ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
COPY apps/api/package.json ./apps/api/

# ── Install Dependencies ────────────────────────────────────
FROM base AS deps
RUN npm install --frozen-lockfile

# ── Development Stage (hot-reload) ─────────────────────────
FROM deps AS development
COPY . .
CMD ["npm", "run", "dev", "--workspace=apps/api"]

# ── Builder Stage ──────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=packages/validation
RUN npm run build --workspace=apps/api

# ── Production Stage ───────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache curl dumb-init
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S fixme && adduser -S -u 1001 -G fixme fixme

# Copy production artifacts only
COPY --from=builder --chown=fixme:fixme /app/apps/api/dist ./dist
COPY --from=builder --chown=fixme:fixme /app/apps/api/package.json ./

# Install production dependencies only
RUN npm install --omit=dev --frozen-lockfile && npm cache clean --force

USER fixme

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health/live || exit 1

# dumb-init ensures proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
