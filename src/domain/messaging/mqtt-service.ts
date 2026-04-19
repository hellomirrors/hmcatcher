import mqtt, { type MqttClient } from "mqtt";
import { advanceFromMqttEvent } from "@/domain/dialog/dialog-engine";
import {
  completeSession,
  getActiveDialog,
  getActiveSessionsByDialog,
  updateSession,
} from "@/domain/dialog/dialog-repository";
import type { DialogStep } from "@/domain/dialog/dialog-schema";
import { createLogger } from "@/lib/logger";
import { logMessage } from "./message-log";
import { createMessagingProvider } from "./provider-factory";

const log = createLogger("mqtt-service");

let client: MqttClient | undefined;
const subscribedTopics = new Set<string>();

function matchPayload(step: DialogStep, payload: Buffer): boolean {
  const raw = payload.toString("utf8").trim();
  const expected = step.mqttMatchString ?? "";

  if (step.mqttMatchMode === "json") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        !step.mqttJsonKey
      ) {
        return false;
      }
      const value = (parsed as Record<string, unknown>)[step.mqttJsonKey];
      return String(value) === expected;
    } catch {
      return false;
    }
  }

  // text mode
  return raw === expected;
}

async function dispatchMqttEvent(
  topic: string,
  payload: Buffer
): Promise<void> {
  const dialog = getActiveDialog();
  if (!dialog) {
    return;
  }

  const sessions = getActiveSessionsByDialog(dialog.id);

  for (const session of sessions) {
    const step = dialog.definition.steps.find(
      (s) => s.id === session.currentStepId
    );
    if (
      !step ||
      step.type !== "mqtt" ||
      step.mqttTopic !== topic ||
      !matchPayload(step, payload)
    ) {
      continue;
    }

    log.info("MQTT event matched session, advancing", {
      sessionId: session.id,
      stepId: step.id,
      topic,
    });

    const result = advanceFromMqttEvent(
      dialog.definition,
      step,
      session.variables,
      session.score
    );

    if (result.session.state === "completed") {
      completeSession(session.id);
    } else {
      updateSession(session.id, {
        currentStepId: result.session.currentStepId,
        variables: result.session.variables,
        score: result.session.score,
      });
    }

    if (result.responses.length === 0) {
      continue;
    }

    try {
      const provider = await createMessagingProvider(session.provider);
      for (const response of result.responses) {
        const sent = await provider.sendText({
          to: session.contact,
          body: response.text,
        });
        logMessage({
          provider: session.provider,
          direction: "out",
          contact: session.contact,
          kind: "text",
          body: response.text,
          externalId: sent.messageId,
        });
      }
    } catch (error) {
      log.error("Failed to send MQTT-triggered response", error, {
        sessionId: session.id,
      });
    }
  }
}

function subscribeToConfiguredTopics(c: MqttClient): void {
  const dialog = getActiveDialog();
  if (!dialog) {
    return;
  }
  for (const step of dialog.definition.steps) {
    if (
      step.type === "mqtt" &&
      step.mqttTopic &&
      !subscribedTopics.has(step.mqttTopic)
    ) {
      c.subscribe(step.mqttTopic, (err) => {
        if (err) {
          log.error("Failed to subscribe to topic", err, {
            topic: step.mqttTopic,
          });
          return;
        }
        subscribedTopics.add(step.mqttTopic as string);
        log.info("Subscribed to MQTT topic", { topic: step.mqttTopic });
      });
    }
  }
}

export function ensureMqttClient(): MqttClient | undefined {
  if (client) {
    return client;
  }

  const url = process.env.MQTT_URL;
  if (!url) {
    log.info("MQTT_URL not set, skipping MQTT client");
    return;
  }

  log.info("Connecting MQTT client", { url });
  client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 5000,
  });

  client.on("connect", () => {
    log.info("MQTT connected");
    if (client) {
      subscribeToConfiguredTopics(client);
    }
  });

  client.on("error", (err) => {
    log.error("MQTT error", err);
  });

  client.on("message", (topic, payload) => {
    dispatchMqttEvent(topic, payload).catch((err) => {
      log.error("MQTT event dispatch failed", err, { topic });
    });
  });

  return client;
}

/** Called when a dialog is saved/activated to pick up new topics. */
export function refreshMqttSubscriptions(): void {
  const c = ensureMqttClient();
  if (c?.connected) {
    subscribeToConfiguredTopics(c);
  }
}
