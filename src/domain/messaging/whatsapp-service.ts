import type {
  ButtonMessage,
  ImageMessage,
  ListMessage,
  MessagingProvider,
  SendResult,
  TextMessage,
} from "@/domain/types";
import { createLogger } from "@/lib/logger";

const API_BASE = "https://graph.facebook.com/v21.0";
const log = createLogger("whatsapp-api");

interface WhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
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
    const messageId = await this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: message.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.body },
        action: {
          buttons: message.buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
    return { messageId, provider: this.name };
  }

  async sendList(message: ListMessage): Promise<SendResult> {
    const interactive: Record<string, unknown> = {
      type: "list",
      header: { type: "text", text: message.title },
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
    log.info("Sending message", {
      url,
      phoneNumberId: this.config.phoneNumberId,
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
      throw new Error(
        `WhatsApp message failed: ${data.error?.message ?? res.statusText}`
      );
    }
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
