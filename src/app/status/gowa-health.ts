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
  device?: string;
  device_id?: string;
  id?: string;
  jid?: string;
  name?: string;
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
    // GoWa scopes the /app/devices endpoint to the session behind the
    // X-Device-Id header — without it, the request is treated as an
    // anonymous probe and never lists the configured session. A 200 back
    // means the device UUID is recognised and authenticated; the body is
    // then the list of WhatsApp-linked devices, which we expose as an
    // operational hint but NOT as the device-id check criterion (those
    // linked-device IDs are WhatsApp JIDs, never the local UUID).
    const res = await fetch(`${baseUrl}/app/devices`, {
      headers: {
        Authorization: authHeader,
        "X-Device-Id": cfg.gowaDeviceId,
      },
      // Keep the status page snappy — GoWa must respond quickly.
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return {
        configured: true,
        reachable: true,
        deviceIdValid: false,
        loggedIn: false,
        configuredDeviceId: cfg.gowaDeviceId,
        knownDevices: [],
        error: `GoWa /app/devices HTTP ${res.status} ${res.statusText}`,
      };
    }
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
    return {
      configured: true,
      reachable: true,
      deviceIdValid: true,
      // At least one linked WhatsApp device means the session is paired.
      loggedIn: devices.length > 0,
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
  // GoWa response shape (by version): { results: [...] } with items that
  // expose either `device`/`jid` (WhatsApp JID of the linked device),
  // `device_id`/`id` (legacy), plus an optional `name` and `state`.
  const arr = pickDeviceArray(data);
  return arr
    .map((d) => ({
      deviceId: d.device_id ?? d.id ?? d.device ?? d.jid ?? "",
      state: d.state ?? (d.device || d.jid ? "linked" : "unknown"),
      jid: d.jid ?? d.device,
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
