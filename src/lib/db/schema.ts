import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Placeholder table — replace with your actual schema
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(), // whatsapp | gowa | telegram
  direction: text("direction").notNull(), // in | out
  contact: text("contact").notNull(), // phone number / chat id of the counterpart
  kind: text("kind").notNull(), // text | image | template
  body: text("body"),
  caption: text("caption"),
  templateName: text("template_name"),
  externalId: text("external_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
