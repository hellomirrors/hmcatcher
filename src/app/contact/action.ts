"use server";

import { z } from "zod/v4";
import {
  type ConversationConfig,
  STAR_TO_RELEVANCE,
} from "@/domain/configuration/configuration-schema";
import { readConfiguration } from "@/domain/configuration/configuration-service";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { createLogger } from "@/lib/logger";

const log = createLogger("action:contact");

const contactFormSchema = z.object({
  provider: z.string().min(1),
  userId: z.string().min(1),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  position: z.string().min(1, "Position ist erforderlich"),
  email: z.email("Bitte eine gültige E-Mail-Adresse eingeben"),
});

export interface ContactFormState {
  error?: string;
  errors?: Record<string, string[]>;
  success: boolean;
}

function getRelevance(
  positionTitle: string,
  config: ConversationConfig
): string {
  const role = config.roles.find((r) => r.title === positionTitle);
  if (role) {
    return STAR_TO_RELEVANCE[role.stars] ?? "HM8201";
  }
  const lower = positionTitle.toLowerCase();
  const keywords = config.customPositionKeywords;
  const isHigh = keywords.highRelevance.some((kw) =>
    lower.includes(kw.toLowerCase())
  );
  if (isHigh) {
    return STAR_TO_RELEVANCE[keywords.highRelevanceStars] ?? "HM4201";
  }
  return STAR_TO_RELEVANCE[keywords.defaultStars] ?? "HM8201";
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const result = contactFormSchema.safeParse({
    provider: formData.get("provider"),
    userId: formData.get("userId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    position: formData.get("position"),
    email: formData.get("email"),
  });

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) {
        fieldErrors[key] = [];
      }
      fieldErrors[key].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  const { provider, userId, firstName, lastName, position, email } =
    result.data;

  try {
    log.info("Submitting contact form", {
      provider,
      userId,
      firstName,
      lastName,
      position,
      email,
    });
    const config = await readConfiguration();
    const relevance = getRelevance(position, config);

    const qrContent = JSON.stringify({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      position,
      email,
      relevance,
    });

    const caption = config.ui.qr_caption_template.replace(
      "{firstName}",
      firstName
    );

    const messagingProvider = await createMessagingProvider(provider);

    await messagingProvider.sendText({
      to: userId,
      body: config.messages.complete,
    });

    const qrBuffer = await generateQrPng(qrContent);
    await messagingProvider.sendImage({
      to: userId,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption,
    });

    log.info("Contact form submitted", { provider, userId, relevance });
    return { success: true };
  } catch (error) {
    log.error("Contact form failed", error, { provider, userId });
    return { success: false, error: (error as Error).message };
  }
}
