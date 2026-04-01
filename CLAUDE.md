@AGENTS.md

## Telegram Bot Setup

The Telegram bot requires a one-time webhook registration per domain. This tells Telegram where to send incoming messages.

### Register webhook

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<DOMAIN>/api/webhooks/telegram"
```

### Verify webhook

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

### Remove webhook (if needed)

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/deleteWebhook"
```

### Current deployment

- Domain: `altenpflege2026.hellomirrors.com`
- Bot: `@hmcatcher_bot`
- Webhook: `https://altenpflege2026.hellomirrors.com/api/webhooks/telegram`
