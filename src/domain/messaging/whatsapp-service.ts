import type {
  ImageMessage,
  MessagingProvider,
  SendResult,
  TextMessage,
} from "@/domain/types";

const API_BASE = "https://graph.facebook.com/v21.0";

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
    const formData = new FormData();
    const uint8 = new Uint8Array(buffer);
    formData.append("file", new Blob([uint8], { type: mimeType }), "qr.png");
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");

    const res = await fetch(`${API_BASE}/${this.config.phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.accessToken}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        `WhatsApp media upload failed: ${data.error?.message ?? res.statusText}`
      );
    }
    return data.id;
  }

  private async postMessage(body: unknown): Promise<string> {
    const res = await fetch(
      `${API_BASE}/${this.config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        `WhatsApp message failed: ${data.error?.message ?? res.statusText}`
      );
    }
    return data.messages[0].id;
  }
}
