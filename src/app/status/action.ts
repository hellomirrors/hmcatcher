"use server";

import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { createLogger } from "@/lib/logger";

const log = createLogger("action:status");

export interface TestResult {
  error?: string;
  messageId?: string;
  provider: string;
  success: boolean;
}

export async function sendTestMessage(
  providerId: string,
  phoneNumber: string
): Promise<TestResult> {
  if (!phoneNumber.trim()) {
    return {
      provider: providerId,
      success: false,
      error: "Telefonnummer fehlt",
    };
  }

  try {
    log.info("Sending test message", { provider: providerId, to: phoneNumber });
    const provider = createMessagingProvider(providerId);
    const result = await provider.sendText({
      to: phoneNumber.replace(/\s+/g, ""),
      body: `Testnachricht von hmcatcher via ${provider.name}`,
    });
    log.info("Test message sent", {
      provider: providerId,
      messageId: result.messageId,
    });
    return {
      provider: providerId,
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    log.error("Test message failed", error, {
      provider: providerId,
      to: phoneNumber,
    });
    return {
      provider: providerId,
      success: false,
      error: (error as Error).message,
    };
  }
}
