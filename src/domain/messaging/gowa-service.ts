import type {
  ImageMessage,
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

  async getPhoneNumber(): Promise<string | null> {
    try {
      const res = await fetch(`${this.config.baseUrl}/app/status`, {
        headers: { Authorization: this.authHeader },
      });
      const data = await res.json();
      const deviceId: string | undefined = data.results?.device_id;
      if (!deviceId) {
        return null;
      }
      return deviceId.replace("@s.whatsapp.net", "");
    } catch {
      return null;
    }
  }

  async sendText(message: TextMessage): Promise<SendResult> {
    const res = await fetch(`${this.config.baseUrl}/send/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        phone: toWhatsAppJid(message.to),
        message: message.body,
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
}
