import { z } from "zod/v4";

export const exampleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  createdAt: z.iso.datetime(),
});

export type Example = z.infer<typeof exampleSchema>;

export const contactDataSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben"),
  mobile: z.string().min(1, "Mobilnummer ist erforderlich"),
  message: z.string().optional(),
});

export type ContactData = z.infer<typeof contactDataSchema>;

export const sendTextInputSchema = z.object({
  to: z.string().min(1, "Empfänger ist erforderlich"),
  body: z.string().min(1, "Nachricht ist erforderlich").max(4096),
});

export type SendTextInput = z.infer<typeof sendTextInputSchema>;

export const sendQrInputSchema = z.object({
  to: z.string().min(1, "Empfänger ist erforderlich"),
  content: z.string().min(1, "QR-Inhalt ist erforderlich").max(2048),
  caption: z.string().optional(),
});

export type SendQrInput = z.infer<typeof sendQrInputSchema>;

export const whatsappVerifyQuerySchema = z.object({
  "hub.mode": z.literal("subscribe"),
  "hub.verify_token": z.string(),
  "hub.challenge": z.string(),
});

export const whatsappWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string(),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            messages: z
              .array(
                z.object({
                  from: z.string(),
                  id: z.string(),
                  timestamp: z.string(),
                  type: z.string(),
                  text: z.object({ body: z.string() }).optional(),
                })
              )
              .optional(),
          }),
          field: z.string(),
        })
      ),
    })
  ),
});

export type WhatsappWebhookPayload = z.infer<
  typeof whatsappWebhookPayloadSchema
>;

export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      from: z.object({
        id: z.number(),
        first_name: z.string(),
        username: z.string().optional(),
      }),
      chat: z.object({
        id: z.number(),
        type: z.string(),
      }),
      date: z.number(),
      text: z.string().optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      from: z.object({
        id: z.number(),
        first_name: z.string(),
        username: z.string().optional(),
      }),
      message: z.object({
        chat: z.object({ id: z.number() }),
      }),
      data: z.string().optional(),
    })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

export const gowaWebhookPayloadSchema = z.object({
  event: z.string(),
  device_id: z.string(),
  payload: z.object({
    id: z.string(),
    chat_id: z.string(),
    from: z.string(),
    from_name: z.string().optional(),
    timestamp: z.string(),
    is_from_me: z.boolean().optional(),
    body: z.string().optional(),
  }),
});

export type GowaWebhookPayload = z.infer<typeof gowaWebhookPayloadSchema>;
