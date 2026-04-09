import { createMessagingProviderFromSettings } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { createLogger } from "@/lib/logger";
import type { ContactData } from "./schema";

const log = createLogger("contact-data");

export async function processContactData(data: ContactData): Promise<void> {
  log.info("Processing contact", {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    mobile: data.mobile,
  });

  const provider = await createMessagingProviderFromSettings();
  const recipient = provider.name === "telegram" ? "701470758" : data.mobile;
  const qrContent = JSON.stringify({
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    mobile: data.mobile,
  });
  const qrBuffer = await generateQrPng(qrContent);

  await provider.sendImage({
    to: recipient,
    imageBuffer: qrBuffer,
    mimeType: "image/png",
    caption: `Hallo ${data.firstName}, hier ist dein QR-Code!`,
  });
}
