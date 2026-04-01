import { readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type ConversationConfig,
  conversationConfigSchema,
} from "./configuration-schema";

function getConfigDir(): string {
  return process.env.SETTINGS_DIR ?? join(homedir(), ".hmcatcher");
}

function getConfigPath(): string {
  return join(getConfigDir(), "conversation-config.json");
}

export async function readConfiguration(): Promise<ConversationConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf-8");
    return conversationConfigSchema.parse(JSON.parse(raw));
  } catch {
    return conversationConfigSchema.parse({});
  }
}

export async function writeConfiguration(
  config: ConversationConfig
): Promise<ConversationConfig> {
  const validated = conversationConfigSchema.parse(config);
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });
  const path = getConfigPath();
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(validated, null, 2), "utf-8");
  await rename(tmp, path);
  invalidateConfigCache();
  return validated;
}

let cachedConfig: ConversationConfig | null = null;

export function invalidateConfigCache(): void {
  cachedConfig = null;
}

export function readConfigurationSync(): ConversationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  try {
    const raw = readFileSync(getConfigPath(), "utf-8");
    cachedConfig = conversationConfigSchema.parse(JSON.parse(raw));
  } catch {
    cachedConfig = conversationConfigSchema.parse({});
  }
  return cachedConfig;
}
