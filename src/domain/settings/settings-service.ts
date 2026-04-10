import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type ResolvedSettings,
  type Settings,
  settingsSchema,
} from "./settings-schema";

function getSettingsDir(): string {
  return process.env.SETTINGS_DIR ?? join(homedir(), ".hmcatcher");
}

function getSettingsPath(): string {
  return join(getSettingsDir(), "settings.json");
}

export async function readSettings(): Promise<Settings> {
  try {
    const raw = await readFile(getSettingsPath(), "utf-8");
    return settingsSchema.parse(JSON.parse(raw));
  } catch {
    return settingsSchema.parse({});
  }
}

export async function writeSettings(
  partial: Partial<Settings>
): Promise<Settings> {
  const current = await readSettings();
  const merged = { ...current, ...partial };
  const validated = settingsSchema.parse(merged);

  const dir = getSettingsDir();
  await mkdir(dir, { recursive: true });

  const path = getSettingsPath();
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(validated, null, 2), "utf-8");
  await rename(tmp, path);

  return validated;
}

const ENV_DEFAULTS: Record<string, string | undefined> = {
  telegramBotToken: "TELEGRAM_BOT_TOKEN",
  telegramBotUsername: "TELEGRAM_BOT_USERNAME",
  whatsappAccessToken: "WHATSAPP_ACCESS_TOKEN",
  whatsappPhoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
  whatsappTestPhoneNumberId: "WHATSAPP_TEST_PHONE_NUMBER_ID",
  whatsappWebhookVerifyToken: "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  whatsappPhoneNumber: "WHATSAPP_PHONE_NUMBER",
  gowaBaseUrl: "GOWA_BASE_URL",
  gowaUsername: "GOWA_USERNAME",
  gowaPassword: "GOWA_PASSWORD",
  gowaDeviceId: "GOWA_DEVICE_ID",
  gowaPhoneNumber: "GOWA_PHONE_NUMBER",
  appBaseUrl: "APP_BASE_URL",
};

function resolve(settings: Settings, key: keyof typeof ENV_DEFAULTS): string {
  const stored = settings[key as keyof Settings];
  if (typeof stored === "string" && stored.length > 0) {
    return stored;
  }
  const envName = ENV_DEFAULTS[key];
  return envName ? (process.env[envName] ?? "") : "";
}

/** Returns settings with all env-var defaults resolved to concrete values. */
export async function resolveSettings(): Promise<ResolvedSettings> {
  const s = await readSettings();
  return {
    whatsappProvider: s.whatsappProvider,
    whatsappPhoneMode: s.whatsappPhoneMode,
    conversationMode: s.conversationMode,
    showTelegramQr: s.showTelegramQr,
    telegramBotToken: resolve(s, "telegramBotToken"),
    telegramBotUsername: resolve(s, "telegramBotUsername") || "hmcatcher_bot",
    whatsappAccessToken: resolve(s, "whatsappAccessToken"),
    whatsappPhoneNumberId: resolve(s, "whatsappPhoneNumberId"),
    whatsappTestPhoneNumberId: resolve(s, "whatsappTestPhoneNumberId"),
    whatsappWebhookVerifyToken: resolve(s, "whatsappWebhookVerifyToken"),
    whatsappPhoneNumber: resolve(s, "whatsappPhoneNumber"),
    gowaBaseUrl: resolve(s, "gowaBaseUrl"),
    gowaUsername: resolve(s, "gowaUsername"),
    gowaPassword: resolve(s, "gowaPassword"),
    gowaDeviceId: resolve(s, "gowaDeviceId"),
    gowaPhoneNumber: resolve(s, "gowaPhoneNumber"),
    appBaseUrl: resolve(s, "appBaseUrl"),
  };
}
