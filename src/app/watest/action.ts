"use server";

import { logMessage } from "@/domain/messaging/message-log";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { WhatsappService } from "@/domain/messaging/whatsapp-service";
import { sendQrInputSchema, sendTextInputSchema } from "@/domain/schema";
import type { ListRow } from "@/domain/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("action:watest");

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

async function runText(
  providerName: "gowa" | "whatsapp",
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
    log.info("Sending text", { provider: providerName, to: result.data.to });
    const provider = await createMessagingProvider(providerName);
    const sent = await provider.sendText(result.data);
    logMessage({
      provider: providerName,
      direction: "out",
      contact: result.data.to,
      kind: "text",
      body: result.data.body,
      externalId: sent.messageId,
    });
    log.info("Text sent", {
      provider: providerName,
      messageId: sent.messageId,
    });
    return { success: true, messageId: sent.messageId };
  } catch (error) {
    log.error("Send text failed", error, {
      provider: providerName,
      to: result.data.to,
    });
    return { success: false, errors: { _form: [(error as Error).message] } };
  }
}

async function runQr(
  providerName: "gowa" | "whatsapp",
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
    log.info("Sending QR", { provider: providerName, to: result.data.to });
    const provider = await createMessagingProvider(providerName);
    const qrBuffer = await generateQrPng(result.data.content);
    const sent = await provider.sendImage({
      to: result.data.to,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption: result.data.caption,
    });
    logMessage({
      provider: providerName,
      direction: "out",
      contact: result.data.to,
      kind: "image",
      body: result.data.content,
      caption: result.data.caption,
      externalId: sent.messageId,
    });
    log.info("QR sent", { provider: providerName, messageId: sent.messageId });
    return { success: true, messageId: sent.messageId };
  } catch (error) {
    log.error("Send QR failed", error, {
      provider: providerName,
      to: result.data.to,
    });
    return { success: false, errors: { _form: [(error as Error).message] } };
  }
}

// GoWA actions
export async function sendGowaTextAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  return await runText("gowa", formData);
}

export async function sendGowaQrAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  return await runQr("gowa", formData);
}

// WhatsApp Business API actions
export async function sendWhatsappTextAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  return await runText("whatsapp", formData);
}

export async function sendWhatsappQrAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  return await runQr("whatsapp", formData);
}

export async function sendWhatsappTemplateAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  const to = String(formData.get("to") ?? "").trim();
  const templateName = String(formData.get("templateName") ?? "").trim();
  const languageCode =
    String(formData.get("languageCode") ?? "").trim() || "en_US";

  const errors: Record<string, string[]> = {};
  if (!to) {
    errors.to = ["Empfänger ist erforderlich"];
  }
  if (!templateName) {
    errors.templateName = ["Template-Name ist erforderlich"];
  }
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const provider = await createMessagingProvider("whatsapp");
  if (!(provider instanceof WhatsappService)) {
    return {
      success: false,
      errors: { _form: ["Template senden nur via WhatsApp Business API"] },
    };
  }

  try {
    log.info("Sending template", { to, templateName, languageCode });
    const sent = await provider.sendTemplate(to, templateName, languageCode);
    logMessage({
      provider: "whatsapp",
      direction: "out",
      contact: to,
      kind: "template",
      templateName: `${templateName} (${languageCode})`,
      externalId: sent.messageId,
    });
    log.info("Template sent", { messageId: sent.messageId });
    return { success: true, messageId: sent.messageId };
  } catch (error) {
    log.error("Send template failed", error, {
      to,
      templateName,
      languageCode,
    });
    return { success: false, errors: { _form: [(error as Error).message] } };
  }
}

export async function sendWhatsappListAction(
  _prev: WatestActionState,
  formData: FormData
): Promise<WatestActionState> {
  const to = String(formData.get("to") ?? "").trim();
  const headerText = String(formData.get("headerText") ?? "").trim();
  const bodyText = String(formData.get("bodyText") ?? "").trim();
  const footerText = String(formData.get("footerText") ?? "").trim();
  const buttonText = String(formData.get("buttonText") ?? "").trim();
  const sectionTitle = String(formData.get("sectionTitle") ?? "").trim();
  const rowsJson = String(formData.get("rows") ?? "[]");

  const errors: Record<string, string[]> = {};
  if (!to) {
    errors.to = ["Empfänger ist erforderlich"];
  }
  if (!bodyText) {
    errors.bodyText = ["Nachrichtentext ist erforderlich"];
  }
  if (!buttonText) {
    errors.buttonText = ["Button-Text ist erforderlich"];
  }

  let rows: ListRow[];
  try {
    rows = JSON.parse(rowsJson) as ListRow[];
  } catch {
    errors.rows = ["Ungültige Zeilen-Daten"];
    return { success: false, errors };
  }

  if (rows.length === 0) {
    errors.rows = ["Mindestens eine Zeile ist erforderlich"];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const provider = await createMessagingProvider("whatsapp");
  if (!(provider instanceof WhatsappService)) {
    return {
      success: false,
      errors: { _form: ["Listen senden nur via WhatsApp Business API"] },
    };
  }

  try {
    log.info("Sending list", { to, buttonText, rowCount: rows.length });
    const sent = await provider.sendList({
      to,
      title: headerText,
      body: bodyText,
      footer: footerText || undefined,
      buttonText,
      sections: [{ title: sectionTitle || "Optionen", rows }],
    });
    logMessage({
      provider: "whatsapp",
      direction: "out",
      contact: to,
      kind: "text",
      body: `[List] ${bodyText}`,
      externalId: sent.messageId,
    });
    log.info("List sent", { messageId: sent.messageId });
    return { success: true, messageId: sent.messageId };
  } catch (error) {
    log.error("Send list failed", error, { to });
    return { success: false, errors: { _form: [(error as Error).message] } };
  }
}
