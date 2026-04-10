import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createLogger } from "@/lib/logger";
import {
  dialogAnswers,
  dialogSessions,
  dialogs,
  leads,
  messages,
} from "./schema";

const log = createLogger("db");

interface Schema extends Record<string, unknown> {
  dialogAnswers: typeof dialogAnswers;
  dialogSessions: typeof dialogSessions;
  dialogs: typeof dialogs;
  leads: typeof leads;
  messages: typeof messages;
}

let _db: BetterSQLite3Database<Schema> | undefined;

function initDb(): BetterSQLite3Database<Schema> {
  if (_db) {
    return _db;
  }

  const { existsSync, mkdirSync } =
    require("node:fs") as typeof import("node:fs");
  const { dirname, join } = require("node:path") as typeof import("node:path");
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  const { drizzle } =
    require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
  const { migrate } =
    require("drizzle-orm/better-sqlite3/migrator") as typeof import("drizzle-orm/better-sqlite3/migrator");

  const dbPath =
    process.env.NODE_ENV === "production"
      ? join(process.env.SETTINGS_DIR ?? "/data", "hmcatcher.db")
      : (() => {
          const devDir = join(
            /*turbopackIgnore: true*/ process.cwd(),
            ".hmcatcher",
            "data"
          );
          if (!existsSync(devDir)) {
            mkdirSync(devDir, { recursive: true });
          }
          return join(devDir, "hmcatcher.db");
        })();

  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  log.info(`Opening database at ${dbPath}`);

  let sqlite: InstanceType<typeof Database>;
  try {
    sqlite = new Database(dbPath);
  } catch (error) {
    log.error("Failed to open database", { path: dbPath, error });
    throw error;
  }

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const instance = drizzle(sqlite, {
    schema: { dialogs, dialogAnswers, dialogSessions, leads, messages },
  });

  const migrationsFolder =
    process.env.DRIZZLE_MIGRATIONS_DIR ??
    join(/*turbopackIgnore: true*/ process.cwd(), "drizzle");
  if (existsSync(migrationsFolder)) {
    try {
      migrate(instance, { migrationsFolder });
    } catch (error) {
      log.error("Database migration failed", { migrationsFolder, error });
      throw error;
    }
  }

  _db = instance;
  return _db;
}

export const db: BetterSQLite3Database<Schema> = new Proxy(
  {} as BetterSQLite3Database<Schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(initDb(), prop, receiver);
    },
  }
);
