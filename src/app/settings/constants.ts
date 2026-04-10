import type { Settings } from "@/domain/settings/settings-schema";

export interface SettingsActionState {
  error?: string;
  settings?: Settings;
  success: boolean;
}

export interface EnvFallbackInfo {
  envName: string;
  hasEnv: boolean;
  key: string;
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

export const STRING_FIELDS = [
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
