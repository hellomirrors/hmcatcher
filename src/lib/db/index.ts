import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { leads } from "./schema";

function getDbPath(): string {
  if (process.env.NODE_ENV === "production") {
    const settingsDir = process.env.SETTINGS_DIR ?? "/data";
    return join(settingsDir, "hmcatcher.db");
  }
  const devDir = join(process.cwd(), ".hmcatcher", "data");
  if (!existsSync(devDir)) {
    mkdirSync(devDir, { recursive: true });
  }
  return join(devDir, "hmcatcher.db");
}

const dbPath = getDbPath();
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema: { leads } });
