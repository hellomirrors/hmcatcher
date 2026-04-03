import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

const dbPath =
  process.env.NODE_ENV === "production"
    ? join(process.env.SETTINGS_DIR ?? "/data", "hmcatcher.db")
    : join(process.cwd(), ".hmcatcher", "data", "hmcatcher.db");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
