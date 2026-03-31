import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import type { ContactData } from "./schema";

export async function processContactData(data: ContactData): Promise<void> {
  console.log(JSON.stringify(data, null, 2));

  const provider = createMessagingProvider();
  const qrContent = JSON.stringify({
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    mobile: data.mobile,
  });
  const qrBuffer = await generateQrPng(qrContent);

  await provider.sendImage({
    to: data.mobile,
    imageBuffer: qrBuffer,
    mimeType: "image/png",
    caption: `Hallo ${data.firstName}, hier ist dein QR-Code!`,
  });
}
