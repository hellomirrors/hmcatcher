import { generateQrPng } from "@/domain/messaging/qr-service";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const content = url.searchParams.get("content");

  if (!content) {
    return new Response("Missing content parameter", { status: 400 });
  }

  const buffer = await generateQrPng(content);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
