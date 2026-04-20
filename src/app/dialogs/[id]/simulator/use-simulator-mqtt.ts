"use client";

import mqtt from "mqtt";
import { useEffect } from "react";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { useSimulatorStore } from "./simulator-store";

// Same broker hmslots uses (see hmexhibitions/hmslots/src/hooks/useMqtt.ts).
// Hardcoded because this is an admin/dev tool — production uses env-driven
// MQTT_URL on the server side.
const MQTT_CONFIG = {
  url: "wss://mosquitto.hellomirrors.com:443/",
  username: "GZ7gEwTFSWIDfS6R",
  password: "tMrVIrnUpKFPtT2Opxm9cVxDwxc4Cvfp",
} as const;

/**
 * Subscribes to the topic of the simulator's current MQTT step (if any) and
 * forwards matching messages into `applyMqttEvent`. This lets the in-browser
 * simulator advance past `mqtt` waits exactly like the production webhook
 * pipeline does — useful for end-to-end testing of the slot-result reflow.
 */
export function useSimulatorMqtt(definition: DialogDefinition): void {
  const session = useSimulatorStore((s) => s.session);
  const status = useSimulatorStore((s) => s.status);
  const applyMqttEvent = useSimulatorStore((s) => s.applyMqttEvent);

  const currentStep = session
    ? definition.steps.find((s) => s.id === session.currentStepId)
    : undefined;
  const topic =
    status === "running" && currentStep?.type === "mqtt"
      ? currentStep.mqttTopic
      : undefined;

  useEffect(() => {
    if (!topic) {
      return;
    }

    console.log("[simulator-mqtt] connecting", { topic });
    const client = mqtt.connect(MQTT_CONFIG.url, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      reconnectPeriod: 5000,
      connectTimeout: 30_000,
      clean: true,
    });

    client.on("connect", () => {
      console.log("[simulator-mqtt] connected, subscribing", { topic });
      client.subscribe(topic, (err) => {
        if (err) {
          console.error("[simulator-mqtt] subscribe error", err);
        }
      });
    });

    client.on("message", (msgTopic, payload) => {
      if (msgTopic !== topic) {
        return;
      }
      const text = payload.toString();
      console.log("[simulator-mqtt] message", { topic: msgTopic, text });
      applyMqttEvent(definition, text);
    });

    client.on("error", (err) => {
      console.error("[simulator-mqtt] error", err);
    });

    return () => {
      console.log("[simulator-mqtt] cleanup", { topic });
      client.end(true);
    };
  }, [topic, definition, applyMqttEvent]);
}
