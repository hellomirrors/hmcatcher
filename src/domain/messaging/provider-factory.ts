import { readSettings } from "@/domain/settings/settings-service";
import type { MessagingProvider } from "@/domain/types";
import { createLogger } from "@/lib/logger";
import { GowaService } from "./gowa-service";
import { TelegramService } from "./telegram-service";
import { WhatsappService } from "./whatsapp-service";

const log = createLogger("provider-factory");

function resolveWhatsappPhoneNumberId(mode: "live" | "test"): string {
  if (mode === "test") {
    const testId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID;
    if (testId) {
      log.info("Using test phone number ID", { phoneNumberId: testId });
      return testId;
    }
    log.warn("WHATSAPP_TEST_PHONE_NUMBER_ID not set, falling back to live");
  }
  const liveId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!liveId) {
    throw new Error("Missing env var: WHATSAPP_PHONE_NUMBER_ID");
  }
  return liveId;
}

export async function createMessagingProvider(
  provider: string
): Promise<MessagingProvider> {
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
    const deviceId = process.env.GOWA_DEVICE_ID;
    if (!(baseUrl && username && password && deviceId)) {
      throw new Error(
        "Missing env vars: GOWA_BASE_URL, GOWA_USERNAME, GOWA_PASSWORD, GOWA_DEVICE_ID"
      );
    }
    return new GowaService({ baseUrl, username, password, deviceId });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Missing env var: WHATSAPP_ACCESS_TOKEN");
  }
  const settings = await readSettings();
  const phoneNumberId = resolveWhatsappPhoneNumberId(
    settings.whatsappPhoneMode
  );
  return new WhatsappService({ accessToken, phoneNumberId });
}

export async function createMessagingProviderFromSettings(): Promise<MessagingProvider> {
  const settings = await readSettings();
  const provider = process.env.MESSAGING_PROVIDER ?? settings.whatsappProvider;
  return createMessagingProvider(provider);
}
