import { z } from "zod/v4";

export const settingsSchema = z.object({
  whatsappProvider: z.enum(["gowa", "whatsapp"]).default("gowa"),
});

export type Settings = z.infer<typeof settingsSchema>;
