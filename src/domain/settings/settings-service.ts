import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { type Settings, settingsSchema } from "./settings-schema";

function getSettingsDir(): string {
  return process.env.SETTINGS_DIR ?? join(homedir(), ".hmcatcher");
}

function getSettingsPath(): string {
  return join(getSettingsDir(), "settings.json");
}

export async function readSettings(): Promise<Settings> {
  try {
    const raw = await readFile(getSettingsPath(), "utf-8");
    return settingsSchema.parse(JSON.parse(raw));
  } catch {
    return settingsSchema.parse({});
  }
}

export async function writeSettings(
  partial: Partial<Settings>
): Promise<Settings> {
  const current = await readSettings();
  const merged = { ...current, ...partial };
  const validated = settingsSchema.parse(merged);

  const dir = getSettingsDir();
  await mkdir(dir, { recursive: true });

  const path = getSettingsPath();
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(validated, null, 2), "utf-8");
  await rename(tmp, path);

  return validated;
}
