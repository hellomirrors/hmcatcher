import type {
  ButtonMessage,
  ImageMessage,
  ListMessage,
  MessagingProvider,
  SendResult,
  TextMessage,
} from "@/domain/types";

interface GowaConfig {
  baseUrl: string;
  password: string;
  username: string;
}

function toWhatsAppJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export class GowaService implements MessagingProvider {
  readonly name = "gowa";
  private readonly config: GowaConfig;

  constructor(config: GowaConfig) {
    this.config = config;
  }

  private get authHeader(): string {
    const encoded = Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString("base64");
    return `Basic ${encoded}`;
  }

  async sendText(message: TextMessage): Promise<SendResult> {
    return await this.postText(message.to, message.body);
  }

  async sendButtons(message: ButtonMessage): Promise<SendResult> {
    const lines = message.buttons.map((b) => `▸ ${b.title}`);
    const text = `${message.body}\n\n${lines.join("\n")}`;
    return await this.postText(message.to, text);
  }

  async sendList(message: ListMessage): Promise<SendResult> {
    const lines: string[] = [];
    for (const section of message.sections) {
      for (const row of section.rows) {
        lines.push(`▸ ${row.title}`);
      }
    }
    const text = `*${message.title}*\n${message.body}\n\n${lines.join("\n")}`;
    return await this.postText(message.to, text);
  }

  async sendImage(message: ImageMessage): Promise<SendResult> {
    const formData = new FormData();
    formData.append("phone", toWhatsAppJid(message.to));
    const uint8 = new Uint8Array(message.imageBuffer);
    formData.append(
      "image",
      new Blob([uint8], { type: message.mimeType }),
      "qr.png"
    );
    if (message.caption) {
      formData.append("caption", message.caption);
    }

    const res = await fetch(`${this.config.baseUrl}/send/image`, {
      method: "POST",
      headers: { Authorization: this.authHeader },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.code !== 200) {
      throw new Error(`GoWA image failed: ${data.message ?? res.statusText}`);
    }
    return {
      messageId: data.results?.message_id ?? "unknown",
      provider: this.name,
    };
  }

  private async postText(to: string, text: string): Promise<SendResult> {
    const res = await fetch(`${this.config.baseUrl}/send/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        phone: toWhatsAppJid(to),
        message: text,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.code !== 200) {
      throw new Error(`GoWA message failed: ${data.message ?? res.statusText}`);
    }
    return {
      messageId: data.results?.message_id ?? "unknown",
      provider: this.name,
    };
  }
}
