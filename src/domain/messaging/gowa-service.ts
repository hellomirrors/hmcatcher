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
  deviceId: string;
  password: string;
  username: string;
}

const TRAILING_SLASHES = /\/+$/;

function toWhatsAppJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export class GowaService implements MessagingProvider {
  readonly name = "gowa";
  private readonly config: GowaConfig;

  constructor(config: GowaConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(TRAILING_SLASHES, ""),
    };
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
    return await this.postPoll(
      message.to,
      message.body,
      message.buttons.map((b) => b.title),
      1
    );
  }

  async sendList(message: ListMessage): Promise<SendResult> {
    const options: string[] = [];
    for (const section of message.sections) {
      for (const row of section.rows) {
        options.push(row.title);
      }
    }
    return await this.postPoll(
      message.to,
      `${message.title}\n${message.body}`,
      options,
      1
    );
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
      headers: {
        Authorization: this.authHeader,
        "X-Device-Id": this.config.deviceId,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`GoWA image failed: ${data.message ?? res.statusText}`);
    }
    return {
      messageId: data.results?.message_id ?? "unknown",
      provider: this.name,
    };
  }

  private async postPoll(
    to: string,
    question: string,
    options: string[],
    maxAnswer: number
  ): Promise<SendResult> {
    const res = await fetch(`${this.config.baseUrl}/send/poll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
        "X-Device-Id": this.config.deviceId,
      },
      body: JSON.stringify({
        phone: toWhatsAppJid(to),
        question,
        options,
        max_answer: maxAnswer,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`GoWA poll failed: ${data.message ?? res.statusText}`);
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
        "X-Device-Id": this.config.deviceId,
      },
      body: JSON.stringify({
        phone: toWhatsAppJid(to),
        message: text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`GoWA message failed: ${data.message ?? res.statusText}`);
    }
    return {
      messageId: data.results?.message_id ?? "unknown",
      provider: this.name,
    };
  }
}
