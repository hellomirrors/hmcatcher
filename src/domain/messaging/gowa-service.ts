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

const log = createLogger("gowa-api");

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

  async sendDocument(message: DocumentMessage): Promise<SendResult> {
    const formData = new FormData();
    formData.append("phone", toWhatsAppJid(message.to));
    const uint8 = new Uint8Array(message.documentBuffer);
    formData.append(
      "file",
      new Blob([uint8], { type: message.mimeType }),
      message.filename
    );
    if (message.caption) {
      formData.append("caption", message.caption);
    }

    const url = `${this.config.baseUrl}/send/file`;
    log.info("Sending file", {
      url,
      to: message.to,
      filename: message.filename,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "X-Device-Id": this.config.deviceId,
      },
      body: formData,
    });

    const data = await this.parseResponse(res, "send file");
    if (!res.ok) {
      throw new Error(`GoWA file failed: ${data.message ?? res.statusText}`);
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

    const url = `${this.config.baseUrl}/send/image`;
    log.info("Sending image", { url, to: message.to });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "X-Device-Id": this.config.deviceId,
      },
      body: formData,
    });

    const data = await this.parseResponse(res, "send image");
    if (!res.ok) {
      throw new Error(`GoWA image failed: ${data.message ?? res.statusText}`);
    }
    return {
      messageId: data.results?.message_id ?? "unknown",
      provider: this.name,
    };
  }

  private async postText(to: string, text: string): Promise<SendResult> {
    const url = `${this.config.baseUrl}/send/message`;
    log.info("Sending text", { url, to });

    const res = await fetch(url, {
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

    const data = await this.parseResponse(res, "send message");
    if (!res.ok) {
      throw new Error(`GoWA message failed: ${data.message ?? res.statusText}`);
    }
    return {
      messageId: data.results?.message_id ?? "unknown",
      provider: this.name,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: API response shape varies
  private async parseResponse(res: Response, operation: string): Promise<any> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      log.error(`Non-JSON response from GoWA API (${operation})`, undefined, {
        status: res.status,
        body: text.slice(0, 500),
      });
      throw new Error(
        `GoWA API returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`
      );
    }
  }
}
