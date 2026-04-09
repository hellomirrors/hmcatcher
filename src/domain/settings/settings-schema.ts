import { z } from "zod/v4";

export const settingsSchema = z.object({
  whatsappProvider: z.enum(["gowa", "whatsapp"]).default("gowa"),
  whatsappPhoneMode: z.enum(["live", "test"]).default("live"),
  conversationMode: z.enum(["chat", "webform", "dialog"]).default("chat"),
});

export type Settings = z.infer<typeof settingsSchema>;
