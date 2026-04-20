import { ensureMqttClient } from "@/domain/messaging/mqtt-service";

export interface MqttStatus {
  configured: boolean;
  connected: boolean;
  url: string | null;
}

/**
 * Reports whether the MQTT broker is configured (env var present) and
 * whether the persistent client is currently connected. The client is
 * lazy-initialized on first call via `ensureMqttClient`.
 */
export function getMqttStatus(): MqttStatus {
  const url = process.env.MQTT_URL ?? null;
  if (!url) {
    return { configured: false, connected: false, url: null };
  }
  const client = ensureMqttClient();
  return {
    configured: true,
    connected: !!client?.connected,
    url,
  };
}
