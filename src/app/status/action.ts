"use server";

import { createMessagingProvider } from "@/domain/messaging/provider-factory";

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
    const provider = createMessagingProvider(providerId);
    const result = await provider.sendText({
      to: phoneNumber.replace(/\s+/g, ""),
      body: `Testnachricht von hmcatcher via ${provider.name}`,
    });
    return {
      provider: providerId,
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      provider: providerId,
      success: false,
      error: (error as Error).message,
    };
  }
}
