FROM node:22-trixie-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm run build

# --- Production ---
# Same base as builder → matching GLIBC and Node ABI, so native modules
# (better-sqlite3) copied below are binary-compatible.
FROM node:22-trixie-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN adduser --system --uid 1001 --no-create-home nextjs
RUN mkdir .next && chown nextjs:root .next
RUN mkdir -p /data && chown nextjs:root /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:root /app/.next/standalone ./
COPY --from=builder --chown=nextjs:root /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:root /app/drizzle ./drizzle
# better-sqlite3 is in serverExternalPackages (next.config.ts) and therefore
# not bundled into .next/standalone. Copy the native module + its dynamic-
# require dependencies from the deps stage.
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

USER nextjs
EXPOSE 3000/tcp
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
