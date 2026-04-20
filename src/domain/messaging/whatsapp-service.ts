import type {
  ButtonMessage,
  DocumentMessage,
  ImageMessage,
  ListMessage,
  MessagingProvider,
  SendResult,
  TextMessage,
} from "@/domain/types";
import { createLogger } from "@/lib/logger";

const API_BASE = "https://graph.facebook.com/v21.0";
const log = createLogger("whatsapp-api");

// WhatsApp Cloud API interactive message limits (reply buttons + lists).
// Source: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
const WA_LIMITS = {
  bodyText: 1024,
  headerText: 60,
  footerText: 60,
  reply: { min: 1, max: 3, titleMax: 20, idMax: 256 },
  list: {
    buttonTextMax: 20,
    sectionTitleMax: 24,
    rowTitleMax: 24,
    rowDescriptionMax: 72,
    rowIdMax: 200,
    maxRowsTotal: 10,
  },
} as const;

interface WhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
}

function assertInteractiveBody(body: string | undefined): void {
  if (!body?.trim()) {
    throw new Error("WhatsApp interactive message: body text is required");
  }
  if (body.length > WA_LIMITS.bodyText) {
    throw new Error(
      `WhatsApp interactive message: body text too long (${body.length} > ${WA_LIMITS.bodyText} chars)`
    );
  }
}

function assertHeaderFooter(header?: string, footer?: string): void {
  if (header && header.length > WA_LIMITS.headerText) {
    throw new Error(
      `WhatsApp interactive message: header too long (${header.length} > ${WA_LIMITS.headerText} chars)`
    );
  }
  if (footer && footer.length > WA_LIMITS.footerText) {
    throw new Error(
      `WhatsApp interactive message: footer too long (${footer.length} > ${WA_LIMITS.footerText} chars)`
    );
  }
}

function assertListRow(
  row: ListMessage["sections"][number]["rows"][number]
): void {
  if (!row.title?.trim()) {
    throw new Error(`WhatsApp list: row title is required (id: "${row.id}")`);
  }
  if (row.title.length > WA_LIMITS.list.rowTitleMax) {
    throw new Error(
      `WhatsApp list: row title too long (${row.title.length} > ${WA_LIMITS.list.rowTitleMax} chars): "${row.title}"`
    );
  }
  if (
    row.description &&
    row.description.length > WA_LIMITS.list.rowDescriptionMax
  ) {
    throw new Error(
      `WhatsApp list: row description too long (${row.description.length} > ${WA_LIMITS.list.rowDescriptionMax} chars)`
    );
  }
  if (!row.id?.trim() || row.id.length > WA_LIMITS.list.rowIdMax) {
    throw new Error(
      `WhatsApp list: row id invalid or too long (max ${WA_LIMITS.list.rowIdMax}): "${row.id}"`
    );
  }
}

function assertListMessage(message: ListMessage): void {
  assertInteractiveBody(message.body);
  assertHeaderFooter(undefined, message.footer);

  if (!message.buttonText?.trim()) {
    throw new Error("WhatsApp list: buttonText is required");
  }
  if (message.buttonText.length > WA_LIMITS.list.buttonTextMax) {
    throw new Error(
      `WhatsApp list: buttonText too long (${message.buttonText.length} > ${WA_LIMITS.list.buttonTextMax} chars): "${message.buttonText}"`
    );
  }

  const totalRows = message.sections.reduce((sum, s) => sum + s.rows.length, 0);
  if (totalRows === 0 || totalRows > WA_LIMITS.list.maxRowsTotal) {
    throw new Error(
      `WhatsApp list: total rows must be 1-${WA_LIMITS.list.maxRowsTotal}, got ${totalRows}`
    );
  }

  for (const section of message.sections) {
    if (section.title.length > WA_LIMITS.list.sectionTitleMax) {
      throw new Error(
        `WhatsApp list: section title too long (${section.title.length} > ${WA_LIMITS.list.sectionTitleMax} chars): "${section.title}"`
      );
    }
    for (const row of section.rows) {
      assertListRow(row);
    }
  }
}

export class WhatsappService implements MessagingProvider {
  readonly name = "whatsapp";
  private readonly config: WhatsappConfig;

  constructor(config: WhatsappConfig) {
    this.config = config;
  }

  async sendText(message: TextMessage): Promise<SendResult> {
    const messageId = await this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: message.to,
      type: "text",
      text: { preview_url: false, body: message.body },
    });
    return { messageId, provider: this.name };
  }

  async sendButtons(message: ButtonMessage): Promise<SendResult> {
    assertInteractiveBody(message.body);
    assertHeaderFooter(message.header, message.footer);

    const count = message.buttons.length;
    if (count < WA_LIMITS.reply.min || count > WA_LIMITS.reply.max) {
      throw new Error(
        `WhatsApp reply buttons: count must be ${WA_LIMITS.reply.min}-${WA_LIMITS.reply.max}, got ${count}. Use sendList for more options.`
      );
    }
    for (const b of message.buttons) {
      if (!b.title?.trim()) {
        throw new Error(
          `WhatsApp reply button: title is required (id: "${b.id}")`
        );
      }
      if (b.title.length > WA_LIMITS.reply.titleMax) {
        throw new Error(
          `WhatsApp reply button: title too long (${b.title.length} > ${WA_LIMITS.reply.titleMax} chars): "${b.title}"`
        );
      }
      if (!b.id?.trim() || b.id.length > WA_LIMITS.reply.idMax) {
        throw new Error(
          `WhatsApp reply button: id invalid or too long (max ${WA_LIMITS.reply.idMax}): "${b.id}"`
        );
      }
    }

    const interactive: Record<string, unknown> = {
      type: "button",
      body: { text: message.body },
      action: {
        buttons: message.buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    };
    if (message.header) {
      interactive.header = { type: "text", text: message.header };
    }
    if (message.footer) {
      interactive.footer = { text: message.footer };
    }
    const messageId = await this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: message.to,
      type: "interactive",
      interactive,
    });
    return { messageId, provider: this.name };
  }

  async sendList(message: ListMessage): Promise<SendResult> {
    assertListMessage(message);

    const interactive: Record<string, unknown> = {
      type: "list",
      body: { text: message.body },
      action: {
        button: message.buttonText,
        sections: message.sections.map((s) => ({
          title: s.title,
          rows: s.rows.map((r) => {
            const row: Record<string, string> = { id: r.id, title: r.title };
            if (r.description) {
              row.description = r.description;
            }
            return row;
          }),
        })),
      },
    };
    // Header is optional in Meta's list payload. Sending an empty string
    // has triggered #131009 in the past — only attach it when populated.
    if (message.title?.trim()) {
      interactive.header = { type: "text", text: message.title };
    }
    if (message.footer) {
      interactive.footer = { text: message.footer };
    }
    const messageId = await this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: message.to,
      type: "interactive",
      interactive,
    });
    return { messageId, provider: this.name };
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string
  ): Promise<SendResult> {
    const messageId = await this.postMessage({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    });
    return { messageId, provider: this.name };
  }

  sendDocument(_message: DocumentMessage): Promise<SendResult> {
    throw new Error(
      "WhatsApp Cloud API document send not implemented. Use forceProvider=gowa on document steps."
    );
  }

  async sendImage(message: ImageMessage): Promise<SendResult> {
    const mediaId = await this.uploadMedia(
      message.imageBuffer,
      message.mimeType
    );
    const messageId = await this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: message.to,
      type: "image",
      image: { id: mediaId, caption: message.caption },
    });
    return { messageId, provider: this.name };
  }

  private async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
    const url = `${API_BASE}/${this.config.phoneNumberId}/media`;
    log.info("Uploading media", { url, mimeType, size: buffer.length });

    const formData = new FormData();
    const uint8 = new Uint8Array(buffer);
    formData.append("file", new Blob([uint8], { type: mimeType }), "qr.png");
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.accessToken}` },
      body: formData,
    });

    const data = await this.parseResponse(res, "media upload");
    if (!res.ok || data.error) {
      throw new Error(
        `WhatsApp media upload failed: ${data.error?.message ?? res.statusText}`
      );
    }
    return data.id;
  }

  private async postMessage(body: unknown): Promise<string> {
    const url = `${API_BASE}/${this.config.phoneNumberId}/messages`;
    const b = body as {
      type?: string;
      interactive?: {
        type?: string;
        action?: { buttons?: unknown[]; sections?: unknown[] };
        body?: { text?: string };
      };
    };
    log.info("Sending message", {
      url,
      phoneNumberId: this.config.phoneNumberId,
      type: b.type,
      interactiveType: b.interactive?.type,
      buttonCount: b.interactive?.action?.buttons?.length,
      sectionCount: b.interactive?.action?.sections?.length,
      bodyLen: b.interactive?.body?.text?.length,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await this.parseResponse(res, "send message");
    if (!res.ok || data.error) {
      log.error("WhatsApp message failed", undefined, {
        status: res.status,
        error: data.error,
        requestType: b.type,
        interactiveType: b.interactive?.type,
      });
      throw new Error(
        `WhatsApp message failed: ${data.error?.message ?? res.statusText}`
      );
    }
    log.info("Message accepted by WhatsApp", {
      messageId: data.messages?.[0]?.id,
      type: b.type,
      interactiveType: b.interactive?.type,
    });
    return data.messages[0].id;
  }

  // biome-ignore lint/suspicious/noExplicitAny: API response shape varies
  private async parseResponse(res: Response, operation: string): Promise<any> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      log.error(
        `Non-JSON response from WhatsApp API (${operation})`,
        undefined,
        {
          status: res.status,
          body: text.slice(0, 500),
        }
      );
      throw new Error(
        `WhatsApp API returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`
      );
    }
  }
}
