import type {
  ImageMessage,
  MessagingProvider,
  SendResult,
  TextMessage,
} from "@/domain/types";

const API_BASE = "https://api.telegram.org";

interface TelegramConfig {
  botToken: string;
}

export class TelegramService implements MessagingProvider {
  readonly name = "telegram";
  private readonly config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  async sendText(message: TextMessage): Promise<SendResult> {
    const res = await fetch(
      `${API_BASE}/bot${this.config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.to,
          text: message.body,
        }),
      }
    );

    const data = await res.json();
    if (!data.ok) {
      throw new Error(
        `Telegram message failed: ${data.description ?? res.statusText}`
      );
    }
    return { messageId: String(data.result.message_id), provider: this.name };
  }

  async sendImage(message: ImageMessage): Promise<SendResult> {
    const formData = new FormData();
    formData.append("chat_id", message.to);
    const uint8 = new Uint8Array(message.imageBuffer);
    formData.append(
      "photo",
      new Blob([uint8], { type: message.mimeType }),
      "qr.png"
    );
    if (message.caption) {
      formData.append("caption", message.caption);
    }

    const res = await fetch(
      `${API_BASE}/bot${this.config.botToken}/sendPhoto`,
      { method: "POST", body: formData }
    );

    const data = await res.json();
    if (!data.ok) {
      throw new Error(
        `Telegram photo failed: ${data.description ?? res.statusText}`
      );
    }
    return { messageId: String(data.result.message_id), provider: this.name };
  }
}
