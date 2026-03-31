"use server";

import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { sendQrInputSchema, sendTextInputSchema } from "@/domain/schema";

export interface WatestActionState {
  errors?: Record<string, string[]>;
  messageId?: string;
  success: boolean;
}

function extractErrors(
  issues: { path: PropertyKey[]; message: string }[]
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    if (!errors[key]) {
      errors[key] = [];
    }
    errors[key].push(issue.message);
  }
  return errors;
}

export async function sendTextAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  const result = sendTextInputSchema.safeParse({
    to: formData.get("to"),
    body: formData.get("body"),
  });

  if (!result.success) {
    return { success: false, errors: extractErrors(result.error.issues) };
  }

  try {
    const provider = createMessagingProvider();
    const sent = await provider.sendText(result.data);
    return { success: true, messageId: sent.messageId };
  } catch (error) {
    return {
      success: false,
      errors: { _form: [(error as Error).message] },
    };
  }
}

export async function sendQrAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  const result = sendQrInputSchema.safeParse({
    to: formData.get("to"),
    content: formData.get("content"),
    caption: formData.get("caption") || undefined,
  });

  if (!result.success) {
    return { success: false, errors: extractErrors(result.error.issues) };
  }

  try {
    const provider = createMessagingProvider();
    const qrBuffer = await generateQrPng(result.data.content);
    const sent = await provider.sendImage({
      to: result.data.to,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption: result.data.caption,
    });
    return { success: true, messageId: sent.messageId };
  } catch (error) {
    return {
      success: false,
      errors: { _form: [(error as Error).message] },
    };
  }
}
