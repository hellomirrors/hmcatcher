import type { ResolvedSettings } from "@/domain/settings/settings-schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("gowa-health");

export interface GowaHealthStatus {
  configured: boolean;
  configuredDeviceId: string | null;
  deviceIdValid: boolean;
  error: string | null;
  knownDevices: { deviceId: string; state: string; jid?: string }[];
  loggedIn: boolean;
  reachable: boolean;
}

interface GowaDevice {
  device_id?: string;
  id?: string;
  jid?: string;
  state?: string;
}

const TRAILING_SLASHES = /\/+$/;

/**
 * Verifies that the configured GoWa device ID exists on the server and is
 * logged in. Used by the status page so a stale / typo-ed device ID shows
 * up immediately instead of silently killing all forceProvider=gowa sends.
 */
export async function getGowaHealth(
  cfg: ResolvedSettings
): Promise<GowaHealthStatus> {
  const baseUrl = cfg.gowaBaseUrl?.replace(TRAILING_SLASHES, "");
  if (!(baseUrl && cfg.gowaUsername && cfg.gowaPassword && cfg.gowaDeviceId)) {
    return {
      configured: false,
      reachable: false,
      deviceIdValid: false,
      loggedIn: false,
      configuredDeviceId: cfg.gowaDeviceId || null,
      knownDevices: [],
      error: null,
    };
  }

  const authHeader = `Basic ${Buffer.from(
    `${cfg.gowaUsername}:${cfg.gowaPassword}`
  ).toString("base64")}`;

  try {
    const res = await fetch(`${baseUrl}/app/devices`, {
      headers: { Authorization: authHeader },
      // Keep the status page snappy — GoWa must respond quickly.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        deviceIdValid: false,
        loggedIn: false,
        configuredDeviceId: cfg.gowaDeviceId,
        knownDevices: [],
        error: `GoWa /app/devices HTTP ${res.status} ${res.statusText}`,
      };
    }
    const data = (await res.json()) as unknown;
    const devices = extractDevices(data);
    const match = devices.find((d) => d.deviceId === cfg.gowaDeviceId);
    return {
      configured: true,
      reachable: true,
      deviceIdValid: !!match,
      loggedIn: match?.state === "logged_in",
      configuredDeviceId: cfg.gowaDeviceId,
      knownDevices: devices,
      error: null,
    };
  } catch (error) {
    log.warn("GoWa health probe failed", { error: (error as Error).message });
    return {
      configured: true,
      reachable: false,
      deviceIdValid: false,
      loggedIn: false,
      configuredDeviceId: cfg.gowaDeviceId,
      knownDevices: [],
      error: (error as Error).message,
    };
  }
}

function extractDevices(
  data: unknown
): { deviceId: string; state: string; jid?: string }[] {
  // GoWa response shape: `{ results: [ { device_id, state, jid }, ... ] }`
  // or a bare array — be defensive either way.
  const arr = pickDeviceArray(data);
  return arr
    .map((d) => ({
      deviceId: d.device_id ?? d.id ?? "",
      state: d.state ?? "unknown",
      jid: d.jid,
    }))
    .filter((d) => d.deviceId);
}

function pickDeviceArray(data: unknown): GowaDevice[] {
  if (Array.isArray(data)) {
    return data as GowaDevice[];
  }
  const results = (data as { results?: GowaDevice[] }).results;
  if (Array.isArray(results)) {
    return results;
  }
  return [];
}
