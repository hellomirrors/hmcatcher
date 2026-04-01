import { readSettings } from "@/domain/settings/settings-service";
import type { MessagingProvider } from "@/domain/types";
import { GowaService } from "./gowa-service";
import { TelegramService } from "./telegram-service";
import { WhatsappService } from "./whatsapp-service";

export function createMessagingProvider(provider: string): MessagingProvider {
  if (provider === "telegram") {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error("Missing env var: TELEGRAM_BOT_TOKEN");
    }
    return new TelegramService({ botToken });
  }

  if (provider === "gowa") {
    const baseUrl = process.env.GOWA_BASE_URL;
    const username = process.env.GOWA_USERNAME;
    const password = process.env.GOWA_PASSWORD;
    if (!(baseUrl && username && password)) {
      throw new Error(
        "Missing env vars: GOWA_BASE_URL, GOWA_USERNAME, GOWA_PASSWORD"
      );
    }
    return new GowaService({ baseUrl, username, password });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!(accessToken && phoneNumberId)) {
    throw new Error(
      "Missing env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID"
    );
  }
  return new WhatsappService({ accessToken, phoneNumberId });
}

export async function createMessagingProviderFromSettings(): Promise<MessagingProvider> {
  const settings = await readSettings();
  const provider = process.env.MESSAGING_PROVIDER ?? settings.whatsappProvider;
  return createMessagingProvider(provider);
}
