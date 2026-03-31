import type { MessagingProvider } from "@/domain/types";
import { TelegramService } from "./telegram-service";
import { WhatsappService } from "./whatsapp-service";

export function createMessagingProvider(): MessagingProvider {
  const provider = process.env.MESSAGING_PROVIDER ?? "whatsapp";

  if (provider === "telegram") {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error("Missing env var: TELEGRAM_BOT_TOKEN");
    }
    return new TelegramService({ botToken });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!(accessToken && phoneNumberId)) {
    throw new Error(
      "Missing env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID"
    );
  }
  return new WhatsappService({ accessToken, phoneNumberId });
}
