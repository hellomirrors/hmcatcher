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

interface MatchResult {
  matched: boolean;
  parsed?: Record<string, unknown>;
}

function parseJsonObject(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return;
  }
}

function matchPayload(
  step: DialogStep,
  payload: Buffer,
  sessionId: string
): MatchResult {
  const raw = payload.toString("utf8").trim();
  const expected = step.mqttMatchString ?? "";

  if (step.mqttMatchMode === "session") {
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      return { matched: false };
    }
    const key = step.mqttSessionIdKey ?? "sessionId";
    const value = parsed[key];
    return { matched: String(value) === sessionId, parsed };
  }

  if (step.mqttMatchMode === "json") {
    const parsed = parseJsonObject(raw);
    if (!(parsed && step.mqttJsonKey)) {
      return { matched: false };
    }
    const value = parsed[step.mqttJsonKey];
    return { matched: String(value) === expected, parsed };
  }

  // text mode
  return { matched: raw === expected };
}

function extractPayloadVars(
  parsed: Record<string, unknown> | undefined
): Record<string, string> {
  if (!parsed) {
    return {};
  }
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      vars[k] = String(v);
    }
  }
  return vars;
}

async function dispatchMqttEvent(
  topic: string,
  payload: Buffer
): Promise<void> {
  const raw = payload.toString("utf8");
  const dialog = getActiveDialog();
  if (!dialog) {
    log.warn("MQTT event ignored: no active dialog", {
      topic,
      payload: raw.slice(0, 200),
    });
    return;
  }

  const sessions = getActiveSessionsByDialog(dialog.id);
  log.info("MQTT event evaluating against active sessions", {
    topic,
    payload: raw.slice(0, 200),
    activeSessions: sessions.length,
    dialogId: dialog.id,
  });

  let matchedAny = false;
  for (const session of sessions) {
    const step = dialog.definition.steps.find(
      (s) => s.id === session.currentStepId
    );
    if (!step || step.type !== "mqtt" || step.mqttTopic !== topic) {
      log.info("Session skipped: not on matching mqtt step", {
        sessionId: session.sessionId,
        currentStepId: session.currentStepId,
        stepType: step?.type,
        stepTopic: step?.mqttTopic,
        eventTopic: topic,
      });
      continue;
    }
    const match = matchPayload(step, payload, session.sessionId);
    if (!match.matched) {
      log.info("Session skipped: payload did not match", {
        sessionId: session.sessionId,
        stepId: step.id,
        matchMode: step.mqttMatchMode,
        sessionIdKey: step.mqttSessionIdKey,
        payloadSnippet: raw.slice(0, 200),
      });
      continue;
    }

    matchedAny = true;
    log.info("MQTT event matched session, advancing", {
      sessionId: session.sessionId,
      stepId: step.id,
      topic,
    });

    const mergedVariables = {
      ...session.variables,
      ...extractPayloadVars(match.parsed),
    };

    const result = advanceFromMqttEvent(
      dialog.definition,
      step,
      mergedVariables,
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
  if (!matchedAny) {
    log.warn("MQTT event matched no session", {
      topic,
      sessionsChecked: sessions.length,
    });
  }
}

function subscribeToConfiguredTopics(c: MqttClient): void {
  const dialog = getActiveDialog();
  if (!dialog) {
    log.warn("Subscribe skipped: no active dialog");
    return;
  }
  const mqttSteps = dialog.definition.steps.filter(
    (s) => s.type === "mqtt" && s.mqttTopic
  );
  log.info("Subscribing to MQTT topics from active dialog", {
    dialogId: dialog.id,
    mqttSteps: mqttSteps.length,
    topics: mqttSteps.map((s) => s.mqttTopic),
  });
  for (const step of mqttSteps) {
    if (subscribedTopics.has(step.mqttTopic as string)) {
      log.info("Already subscribed", { topic: step.mqttTopic });
      continue;
    }
    log.info("Subscribing to topic", { topic: step.mqttTopic });
    c.subscribe(step.mqttTopic as string, (err) => {
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
    log.info("MQTT message received", {
      topic,
      bytes: payload.length,
      preview: payload.toString("utf8").slice(0, 200),
    });
    dispatchMqttEvent(topic, payload).catch((err) => {
      log.error("MQTT event dispatch failed", err, { topic });
    });
  });

  client.on("close", () => {
    log.warn("MQTT connection closed");
  });

  client.on("reconnect", () => {
    log.info("MQTT reconnecting");
  });

  return client;
}

/** Called when a dialog is saved/activated to pick up new topics. */
export function refreshMqttSubscriptions(): void {
  const c = ensureMqttClient();
  if (!c) {
    log.warn("Refresh subscriptions: client unavailable (MQTT_URL missing?)");
    return;
  }
  if (!c.connected) {
    log.info(
      "Refresh subscriptions: client not yet connected — will subscribe on connect"
    );
    return;
  }
  subscribeToConfiguredTopics(c);
}
