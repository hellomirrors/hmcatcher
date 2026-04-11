FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# --- Production ---
# Must match builder's GLIBC (oven/bun:1 is trixie-based → GLIBC 2.38).
# better-sqlite3 is copied as a prebuilt native binary from the builder.
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
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

USER nextjs
EXPOSE 3000/tcp
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
