FROM node:22-slim AS base
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
COPY package.json ./
RUN npm install --ignore-scripts

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ARG TELEGRAM_BOT_USERNAME=hmcatcher
ARG WHATSAPP_PHONE_NUMBER=4917012345678
ENV TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
ENV WHATSAPP_PHONE_NUMBER=${WHATSAPP_PHONE_NUMBER}
RUN npx next build

# --- Production ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN adduser --system --uid 1001 nextjs
RUN mkdir .next && chown nextjs:root .next

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:root /app/.next/standalone ./
COPY --from=builder --chown=nextjs:root /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000/tcp
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
