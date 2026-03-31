import QRCode from "qrcode";

export function generateQrPng(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    type: "png",
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
