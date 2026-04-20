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

const ENV_DEFAULTS: Record<string, string> = {
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
  openrouterApiKey: "OPENROUTER_API_KEY",
};

/**
 * Seeds empty settings fields from environment variables and persists them.
 * Returns the (potentially updated) settings.
 */
async function seedFromEnv(settings: Settings): Promise<Settings> {
  const patch: Partial<Settings> = {};
  let dirty = false;

  for (const [key, envName] of Object.entries(ENV_DEFAULTS)) {
    const stored = settings[key as keyof Settings];
    if (typeof stored === "string" && stored.length > 0) {
      continue;
    }
    const envValue = process.env[envName];
    if (envValue) {
      (patch as Record<string, string>)[key] = envValue;
      dirty = true;
    }
  }

  if (!dirty) {
    return settings;
  }

  return await writeSettings({ ...settings, ...patch });
}

/** Returns settings with env defaults seeded into the store. */
export async function resolveSettings(): Promise<ResolvedSettings> {
  const raw = await readSettings();
  const s = await seedFromEnv(raw);

  return {
    whatsappProvider: s.whatsappProvider,
    whatsappPhoneMode: s.whatsappPhoneMode,
    showTelegramQr: s.showTelegramQr,
    telegramBotToken: s.telegramBotToken ?? "",
    telegramBotUsername: s.telegramBotUsername || "hmcatcher_bot",
    whatsappAccessToken: s.whatsappAccessToken ?? "",
    whatsappPhoneNumberId: s.whatsappPhoneNumberId ?? "",
    whatsappTestPhoneNumberId: s.whatsappTestPhoneNumberId ?? "",
    whatsappWebhookVerifyToken: s.whatsappWebhookVerifyToken ?? "",
    whatsappPhoneNumber: s.whatsappPhoneNumber ?? "",
    gowaBaseUrl: s.gowaBaseUrl ?? "",
    gowaUsername: s.gowaUsername ?? "",
    gowaPassword: s.gowaPassword ?? "",
    gowaDeviceId: s.gowaDeviceId ?? "",
    gowaPhoneNumber: s.gowaPhoneNumber ?? "",
    appBaseUrl: s.appBaseUrl ?? "",
    openrouterApiKey: s.openrouterApiKey ?? "",
    openrouterModel: s.openrouterModel ?? "",
  };
}
