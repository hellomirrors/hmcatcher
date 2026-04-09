import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("message-log");

export type MessageDirection = "in" | "out";
export type MessageKind = "text" | "image" | "template";
export type MessageProvider = "whatsapp" | "gowa" | "telegram";

export interface LogMessageInput {
  body?: string | null;
  caption?: string | null;
  contact: string;
  direction: MessageDirection;
  externalId?: string | null;
  kind: MessageKind;
  provider: string;
  templateName?: string | null;
}

export function logMessage(input: LogMessageInput): void {
  try {
    db.insert(messages)
      .values({
        provider: input.provider,
        direction: input.direction,
        contact: input.contact,
        kind: input.kind,
        body: input.body ?? null,
        caption: input.caption ?? null,
        templateName: input.templateName ?? null,
        externalId: input.externalId ?? null,
      })
      .run();
  } catch (error) {
    log.error("Failed to log message", error, {
      provider: input.provider,
      contact: input.contact,
      kind: input.kind,
    });
  }
}

export interface ContactSummary {
  contact: string;
  count: number;
  lastAt: Date;
  lastBody: string | null;
  lastDirection: string;
  provider: string;
}

export function listContacts(): ContactSummary[] {
  const rows = db
    .select({
      provider: messages.provider,
      contact: messages.contact,
      lastBody: sql<string | null>`(
        SELECT m2.body FROM messages m2
        WHERE m2.contact = ${messages.contact} AND m2.provider = ${messages.provider}
        ORDER BY m2.created_at DESC LIMIT 1
      )`,
      lastDirection: sql<string>`(
        SELECT m2.direction FROM messages m2
        WHERE m2.contact = ${messages.contact} AND m2.provider = ${messages.provider}
        ORDER BY m2.created_at DESC LIMIT 1
      )`,
      lastAt: sql<number>`MAX(${messages.createdAt})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(messages)
    .groupBy(messages.provider, messages.contact)
    .orderBy(sql`MAX(${messages.createdAt}) DESC`)
    .all();

  return rows.map((r) => ({
    provider: r.provider,
    contact: r.contact,
    lastBody: r.lastBody,
    lastDirection: r.lastDirection,
    lastAt: new Date(Number(r.lastAt) * 1000),
    count: Number(r.count),
  }));
}

export interface ConversationMessage {
  body: string | null;
  caption: string | null;
  contact: string;
  createdAt: Date;
  direction: string;
  id: number;
  kind: string;
  provider: string;
  templateName: string | null;
}

export function getConversation(
  provider: string,
  contact: string
): ConversationMessage[] {
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.provider, provider), eq(messages.contact, contact)))
    .orderBy(messages.createdAt)
    .all()
    .map((m) => ({
      id: m.id,
      provider: m.provider,
      direction: m.direction,
      contact: m.contact,
      kind: m.kind,
      body: m.body,
      caption: m.caption,
      templateName: m.templateName,
      createdAt: m.createdAt,
    }));
}
