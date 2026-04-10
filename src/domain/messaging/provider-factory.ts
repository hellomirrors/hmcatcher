import type { ResolvedSettings } from "@/domain/settings/settings-schema";
import { resolveSettings } from "@/domain/settings/settings-service";
import type { MessagingProvider } from "@/domain/types";
import { createLogger } from "@/lib/logger";
import { GowaService } from "./gowa-service";
import { TelegramService } from "./telegram-service";
import { WhatsappService } from "./whatsapp-service";

const log = createLogger("provider-factory");

function resolveWhatsappPhoneNumberId(
  mode: "live" | "test",
  cfg: ResolvedSettings
): string {
  if (mode === "test") {
    const testId = cfg.whatsappTestPhoneNumberId;
    if (testId) {
      log.info("Using test phone number ID", { phoneNumberId: testId });
      return testId;
    }
    log.warn("whatsappTestPhoneNumberId not set, falling back to live");
  }
  const liveId = cfg.whatsappPhoneNumberId;
  if (!liveId) {
    throw new Error("Missing setting: whatsappPhoneNumberId");
  }
  return liveId;
}

export async function createMessagingProvider(
  provider: string
): Promise<MessagingProvider> {
  const cfg = await resolveSettings();

  if (provider === "telegram") {
    if (!cfg.telegramBotToken) {
      throw new Error("Missing setting: telegramBotToken");
    }
    return new TelegramService({ botToken: cfg.telegramBotToken });
  }

  if (provider === "gowa") {
    if (
      !(
        cfg.gowaBaseUrl &&
        cfg.gowaUsername &&
        cfg.gowaPassword &&
        cfg.gowaDeviceId
      )
    ) {
      throw new Error(
        "Missing settings: gowaBaseUrl, gowaUsername, gowaPassword, gowaDeviceId"
      );
    }
    return new GowaService({
      baseUrl: cfg.gowaBaseUrl,
      username: cfg.gowaUsername,
      password: cfg.gowaPassword,
      deviceId: cfg.gowaDeviceId,
    });
  }

  if (!cfg.whatsappAccessToken) {
    throw new Error("Missing setting: whatsappAccessToken");
  }
  const phoneNumberId = resolveWhatsappPhoneNumberId(
    cfg.whatsappPhoneMode,
    cfg
  );
  return new WhatsappService({
    accessToken: cfg.whatsappAccessToken,
    phoneNumberId,
  });
}

export async function createMessagingProviderFromSettings(): Promise<MessagingProvider> {
  const cfg = await resolveSettings();
  return createMessagingProvider(cfg.whatsappProvider);
}
