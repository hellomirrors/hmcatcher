import { z } from "zod/v4";

export const settingsSchema = z.object({
  // Behavior
  whatsappProvider: z.enum(["gowa", "whatsapp"]).default("gowa"),
  whatsappPhoneMode: z.enum(["live", "test"]).default("live"),
  conversationMode: z.enum(["chat", "webform", "dialog"]).default("chat"),

  // Feature flags
  showTelegramQr: z.boolean().default(true),

  // Telegram
  telegramBotToken: z.string().optional(),
  telegramBotUsername: z.string().optional(),

  // WhatsApp (Meta Cloud API)
  whatsappAccessToken: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappTestPhoneNumberId: z.string().optional(),
  whatsappWebhookVerifyToken: z.string().optional(),
  whatsappPhoneNumber: z.string().optional(),

  // GoWA
  gowaBaseUrl: z.string().optional(),
  gowaUsername: z.string().optional(),
  gowaPassword: z.string().optional(),
  gowaDeviceId: z.string().optional(),
  gowaPhoneNumber: z.string().optional(),

  // General
  appBaseUrl: z.string().optional(),

  // AI / OpenRouter
  openrouterApiKey: z.string().optional(),
  openrouterModel: z.string().optional(),
});

export type Settings = z.infer<typeof settingsSchema>;

/** Settings with all optional values resolved (env defaults applied). */
export interface ResolvedSettings {
  appBaseUrl: string;
  conversationMode: "chat" | "dialog" | "webform";
  gowaBaseUrl: string;
  gowaDeviceId: string;
  gowaPassword: string;
  gowaPhoneNumber: string;
  gowaUsername: string;
  openrouterApiKey: string;
  openrouterModel: string;
  showTelegramQr: boolean;
  telegramBotToken: string;
  telegramBotUsername: string;
  whatsappAccessToken: string;
  whatsappPhoneMode: "live" | "test";
  whatsappPhoneNumber: string;
  whatsappPhoneNumberId: string;
  whatsappProvider: "gowa" | "whatsapp";
  whatsappTestPhoneNumberId: string;
  whatsappWebhookVerifyToken: string;
}
