import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  provider: text("provider").notNull(),
  direction: text("direction").notNull(),
  contact: text("contact").notNull(),
  kind: text("kind").notNull(),
  body: text("body"),
  caption: text("caption"),
  templateName: text("template_name"),
  externalId: text("external_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dialogs = sqliteTable("dialogs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  definition: text("definition").notNull(), // JSON: DialogDefinition
  isActive: integer("is_active").notNull().default(0),
  isLocked: integer("is_locked").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dialogSessions = sqliteTable("dialog_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dialogId: integer("dialog_id")
    .notNull()
    .references(() => dialogs.id),
  provider: text("provider").notNull(),
  contact: text("contact").notNull(),
  currentStepId: text("current_step_id").notNull(),
  variables: text("variables").notNull().default("{}"),
  score: integer("score").notNull().default(0),
  state: text("state").notNull().default("active"), // active | completed | expired
  reminderSentAt: integer("reminder_sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dialogAnswers = sqliteTable("dialog_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => dialogSessions.id),
  stepId: text("step_id").notNull(),
  answerValue: text("answer_value").notNull(),
  answerLabel: text("answer_label"),
  scoreAdded: integer("score_added").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
