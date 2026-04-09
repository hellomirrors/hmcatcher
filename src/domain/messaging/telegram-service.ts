import type {
  ButtonMessage,
  ImageMessage,
  ListMessage,
  MessagingProvider,
  SendResult,
  TextMessage,
} from "@/domain/types";
import { createLogger } from "@/lib/logger";

const API_BASE = "https://api.telegram.org";
const log = createLogger("telegram-api");

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
    const res = await this.post("sendMessage", {
      chat_id: message.to,
      text: message.body,
    });
    return { messageId: String(res.result.message_id), provider: this.name };
  }

  async sendButtons(message: ButtonMessage): Promise<SendResult> {
    const keyboard = message.buttons.map((b) => [
      { text: b.title, callback_data: b.id },
    ]);
    const res = await this.post("sendMessage", {
      chat_id: message.to,
      text: message.body,
      reply_markup: { inline_keyboard: keyboard },
    });
    return { messageId: String(res.result.message_id), provider: this.name };
  }

  async sendList(message: ListMessage): Promise<SendResult> {
    const rows = message.sections.flatMap((s) => s.rows);
    const keyboard = rows.map((r) => [{ text: r.title, callback_data: r.id }]);
    const res = await this.post("sendMessage", {
      chat_id: message.to,
      text: `*${message.title}*\n${message.body}`,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
    return { messageId: String(res.result.message_id), provider: this.name };
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

    const url = `${API_BASE}/bot${this.config.botToken}/sendPhoto`;
    log.info("Sending photo", { chatId: message.to });

    const res = await fetch(url, { method: "POST", body: formData });

    const data = await this.parseResponse(res, "sendPhoto");
    if (!data.ok) {
      throw new Error(
        `Telegram photo failed: ${data.description ?? res.statusText}`
      );
    }
    return { messageId: String(data.result.message_id), provider: this.name };
  }

  private async post(
    method: string,
    body: unknown
  ): Promise<{ result: { message_id: number } }> {
    log.info(`Calling ${method}`, { method });

    const res = await fetch(
      `${API_BASE}/bot${this.config.botToken}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await this.parseResponse(res, method);
    if (!data.ok) {
      throw new Error(
        `Telegram ${method} failed: ${data.description ?? res.statusText}`
      );
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: API response shape varies
  private async parseResponse(res: Response, operation: string): Promise<any> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      log.error(
        `Non-JSON response from Telegram API (${operation})`,
        undefined,
        {
          status: res.status,
          body: text.slice(0, 500),
        }
      );
      throw new Error(
        `Telegram API returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`
      );
    }
  }
}
