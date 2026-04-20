import { z } from "zod/v4";
import { ensureMqttClient } from "@/domain/messaging/mqtt-service";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:mqtt-publish");

const publishSchema = z.object({
  topic: z.string().min(1).max(200),
  payload: z.string().max(10_000),
});

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "invalid payload" },
      { status: 400 }
    );
  }

  const client = ensureMqttClient();
  if (!client) {
    return Response.json(
      { ok: false, error: "MQTT not configured" },
      { status: 503 }
    );
  }

  await new Promise<void>((resolve, reject) => {
    client.publish(
      parsed.data.topic,
      parsed.data.payload,
      { qos: 0 },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });

  log.info("Published MQTT message", {
    topic: parsed.data.topic,
    bytes: parsed.data.payload.length,
  });

  return Response.json({ ok: true });
}
