import { z } from "zod/v4";

export const settingsSchema = z.object({
  whatsappProvider: z.enum(["gowa", "whatsapp"]).default("gowa"),
  conversationMode: z.enum(["chat", "webform"]).default("chat"),
});

export type Settings = z.infer<typeof settingsSchema>;
