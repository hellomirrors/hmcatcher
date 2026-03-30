FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# --- Install dependencies into temp dir (cached) ---
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# --- Build ---
FROM base AS builder
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# --- Production ---
FROM base AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/.next/standalone ./
COPY --from=builder /usr/src/app/.next/static ./.next/static
COPY --from=builder /usr/src/app/package.json .

USER bun
EXPOSE 3000/tcp
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
