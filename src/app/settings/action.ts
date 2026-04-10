"use server";

import { revalidatePath } from "next/cache";
import type { Settings } from "@/domain/settings/settings-schema";
import {
  readSettings,
  writeSettings,
} from "@/domain/settings/settings-service";

export interface SettingsActionState {
  error?: string;
  settings?: Settings;
  success: boolean;
}

export async function getSettingsAction(): Promise<Settings> {
  return await readSettings();
}

/** Maps setting keys to their env-var fallback names. */
export const ENV_FALLBACKS: Record<string, string> = {
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

export interface EnvFallbackInfo {
  envName: string;
  hasEnv: boolean;
  key: string;
}

export function getEnvFallbacks(): EnvFallbackInfo[] {
  return Object.entries(ENV_FALLBACKS).map(([key, envName]) => ({
    key,
    envName,
    hasEnv: !!process.env[envName],
  }));
}

const STRING_FIELDS = [
  "telegramBotToken",
  "telegramBotUsername",
  "whatsappAccessToken",
  "whatsappPhoneNumberId",
  "whatsappTestPhoneNumberId",
  "whatsappWebhookVerifyToken",
  "whatsappPhoneNumber",
  "gowaBaseUrl",
  "gowaUsername",
  "gowaPassword",
  "gowaDeviceId",
  "gowaPhoneNumber",
  "appBaseUrl",
] as const;

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const patch: Partial<Settings> = {
      whatsappProvider: formData.get(
        "whatsappProvider"
      ) as Settings["whatsappProvider"],
      whatsappPhoneMode: formData.get(
        "whatsappPhoneMode"
      ) as Settings["whatsappPhoneMode"],
      conversationMode: formData.get(
        "conversationMode"
      ) as Settings["conversationMode"],
      showTelegramQr: formData.get("showTelegramQr") === "on",
    };

    for (const field of STRING_FIELDS) {
      const value = formData.get(field);
      patch[field] =
        typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    const settings = await writeSettings(patch);
    revalidatePath("/settings");
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
