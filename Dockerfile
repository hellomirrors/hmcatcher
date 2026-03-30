FROM node:22-alpine AS base
RUN npm install -g bun
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
FROM node:22-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN adduser --system --uid 1001 nextjs
RUN mkdir .next && chown nextjs:root .next

COPY --from=builder /usr/src/app/public ./public
COPY --from=builder --chown=nextjs:root /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:root /usr/src/app/.next/static ./.next/static

USER nextjs
EXPOSE 3000/tcp
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
