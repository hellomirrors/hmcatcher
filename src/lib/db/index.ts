import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { leads, messages } from "./schema";

interface Schema {
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

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema: { leads, messages } });

  const migrationsFolder =
    process.env.DRIZZLE_MIGRATIONS_DIR ??
    join(/*turbopackIgnore: true*/ process.cwd(), "drizzle");
  if (existsSync(migrationsFolder)) {
    try {
      migrate(_db, { migrationsFolder });
    } catch (error) {
      console.error("Failed to apply migrations:", error);
    }
  }

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
