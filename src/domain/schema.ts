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
  phone: z.string().optional(),
  message: z.string().optional(),
});

export type ContactData = z.infer<typeof contactDataSchema>;
