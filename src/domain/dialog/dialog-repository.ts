import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions, dialogs } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { type DialogDefinition, dialogDefinitionSchema } from "./dialog-schema";

const log = createLogger("dialog-repository");

// ---------------------------------------------------------------------------
// Dialog types
// ---------------------------------------------------------------------------

interface DialogRow {
  createdAt: Date;
  definition: DialogDefinition;
  description: string | null;
  id: number;
  isActive: number;
  isLocked: number;
  name: string;
  slug: string;
  updatedAt: Date;
  version: number;
}

interface DialogListItem {
  createdAt: Date;
  description: string | null;
  id: number;
  isActive: number;
  isLocked: number;
  name: string;
  slug: string;
  version: number;
}

interface CreateDialogInput {
  definition: DialogDefinition;
  description?: string;
  name: string;
  slug: string;
}

interface UpdateDialogInput {
  definition?: DialogDefinition;
  description?: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

interface SessionRow {
  contact: string;
  createdAt: Date;
  currentStepId: string;
  dialogId: number;
  id: number;
  provider: string;
  reminderSentAt: Date | null;
  score: number;
  state: string;
  updatedAt: Date;
  variables: Record<string, string>;
}

interface CreateSessionInput {
  contact: string;
  currentStepId: string;
  dialogId: number;
  provider: string;
}

interface UpdateSessionInput {
  currentStepId?: string;
  reminderSentAt?: Date;
  score?: number;
  state?: string;
  variables?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Answer types
// ---------------------------------------------------------------------------

interface InsertAnswerInput {
  answerLabel?: string;
  answerValue: string;
  scoreAdded?: number;
  sessionId: number;
  stepId: string;
}

interface AnswerRow {
  answerLabel: string | null;
  answerValue: string;
  createdAt: Date;
  id: number;
  scoreAdded: number;
  sessionId: number;
  stepId: string;
}

// ---------------------------------------------------------------------------
// Expired session type
// ---------------------------------------------------------------------------

interface ExpiredSession {
  contact: string;
  currentStepId: string;
  dialogId: number;
  id: number;
  provider: string;
  reminderSentAt: Date | null;
  state: string;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDefinition(raw: string): DialogDefinition | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return dialogDefinitionSchema.parse(parsed);
  } catch (error) {
    log.error("Failed to parse dialog definition", error);
    return undefined;
  }
}

function parseVariables(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function toDialogRow(row: typeof dialogs.$inferSelect): DialogRow | undefined {
  const definition = parseDefinition(row.definition);
  if (!definition) {
    return undefined;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    definition,
    isActive: row.isActive,
    isLocked: row.isLocked,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSessionRow(row: typeof dialogSessions.$inferSelect): SessionRow {
  return {
    id: row.id,
    dialogId: row.dialogId,
    provider: row.provider,
    contact: row.contact,
    currentStepId: row.currentStepId,
    variables: parseVariables(row.variables),
    score: row.score,
    state: row.state,
    reminderSentAt: row.reminderSentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Dialog CRUD
// ---------------------------------------------------------------------------

export function getActiveDialog(): DialogRow | undefined {
  try {
    const row = db.select().from(dialogs).where(eq(dialogs.isActive, 1)).get();
    if (!row) {
      return undefined;
    }
    return toDialogRow(row);
  } catch (error) {
    log.error("Failed to get active dialog", error);
    return undefined;
  }
}

export function getDialogById(id: number): DialogRow | undefined {
  try {
    const row = db.select().from(dialogs).where(eq(dialogs.id, id)).get();
    if (!row) {
      return undefined;
    }
    return toDialogRow(row);
  } catch (error) {
    log.error("Failed to get dialog by id", error, { dialogId: id });
    return undefined;
  }
}

export function listDialogs(): DialogListItem[] {
  try {
    return db
      .select({
        id: dialogs.id,
        slug: dialogs.slug,
        name: dialogs.name,
        description: dialogs.description,
        isActive: dialogs.isActive,
        isLocked: dialogs.isLocked,
        version: dialogs.version,
        createdAt: dialogs.createdAt,
      })
      .from(dialogs)
      .all();
  } catch (error) {
    log.error("Failed to list dialogs", error);
    return [];
  }
}

export function createDialog(input: CreateDialogInput): number {
  try {
    const result = db
      .insert(dialogs)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        definition: JSON.stringify(input.definition),
      })
      .run();
    return Number(result.lastInsertRowid);
  } catch (error) {
    log.error("Failed to create dialog", error, { slug: input.slug });
    throw error;
  }
}

export function updateDialog(id: number, input: UpdateDialogInput): void {
  try {
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.description !== undefined) {
      updates.description = input.description;
    }
    if (input.definition !== undefined) {
      updates.definition = JSON.stringify(input.definition);
    }
    db.update(dialogs).set(updates).where(eq(dialogs.id, id)).run();
  } catch (error) {
    log.error("Failed to update dialog", error, { dialogId: id });
    throw error;
  }
}

export function deleteDialog(id: number): void {
  try {
    // Find all sessions for this dialog to cascade delete answers
    const sessions = db
      .select({ id: dialogSessions.id })
      .from(dialogSessions)
      .where(eq(dialogSessions.dialogId, id))
      .all();

    for (const session of sessions) {
      db.delete(dialogAnswers)
        .where(eq(dialogAnswers.sessionId, session.id))
        .run();
    }

    db.delete(dialogSessions).where(eq(dialogSessions.dialogId, id)).run();

    db.delete(dialogs).where(eq(dialogs.id, id)).run();
  } catch (error) {
    log.error("Failed to delete dialog", error, { dialogId: id });
    throw error;
  }
}

export function setActiveDialog(id: number): void {
  try {
    db.update(dialogs)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(eq(dialogs.isActive, 1))
      .run();
    db.update(dialogs)
      .set({ isActive: 1, updatedAt: new Date() })
      .where(eq(dialogs.id, id))
      .run();
  } catch (error) {
    log.error("Failed to set active dialog", error, { dialogId: id });
    throw error;
  }
}

export function deactivateDialog(id: number): void {
  try {
    db.update(dialogs).set({ isActive: 0 }).where(eq(dialogs.id, id)).run();
  } catch (error) {
    log.error("Failed to deactivate dialog", error, { dialogId: id });
    throw error;
  }
}

export function setDialogLocked(id: number, locked: boolean): void {
  try {
    db.update(dialogs)
      .set({ isLocked: locked ? 1 : 0, updatedAt: new Date() })
      .where(eq(dialogs.id, id))
      .run();
  } catch (error) {
    log.error("Failed to set dialog lock", error, { dialogId: id, locked });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

export function getSession(
  provider: string,
  contact: string
): SessionRow | undefined {
  try {
    const row = db
      .select()
      .from(dialogSessions)
      .where(
        and(
          eq(dialogSessions.provider, provider),
          eq(dialogSessions.contact, contact),
          eq(dialogSessions.state, "active")
        )
      )
      .get();
    if (!row) {
      return undefined;
    }
    return toSessionRow(row);
  } catch (error) {
    log.error("Failed to get session", error, { provider, contact });
    return undefined;
  }
}

export function createSession(input: CreateSessionInput): number {
  try {
    const result = db
      .insert(dialogSessions)
      .values({
        dialogId: input.dialogId,
        provider: input.provider,
        contact: input.contact,
        currentStepId: input.currentStepId,
        state: "active",
      })
      .run();
    return Number(result.lastInsertRowid);
  } catch (error) {
    log.error("Failed to create session", error, {
      dialogId: input.dialogId,
      provider: input.provider,
      contact: input.contact,
    });
    throw error;
  }
}

export function updateSession(id: number, updates: UpdateSessionInput): void {
  try {
    const values: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.currentStepId !== undefined) {
      values.currentStepId = updates.currentStepId;
    }
    if (updates.variables !== undefined) {
      values.variables = JSON.stringify(updates.variables);
    }
    if (updates.score !== undefined) {
      values.score = updates.score;
    }
    if (updates.state !== undefined) {
      values.state = updates.state;
    }
    if (updates.reminderSentAt !== undefined) {
      values.reminderSentAt = updates.reminderSentAt;
    }
    db.update(dialogSessions)
      .set(values)
      .where(eq(dialogSessions.id, id))
      .run();
  } catch (error) {
    log.error("Failed to update session", error, { sessionId: id });
    throw error;
  }
}

export function completeSession(id: number): void {
  try {
    db.update(dialogSessions)
      .set({ state: "completed", updatedAt: new Date() })
      .where(eq(dialogSessions.id, id))
      .run();
  } catch (error) {
    log.error("Failed to complete session", error, { sessionId: id });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Answer CRUD
// ---------------------------------------------------------------------------

export function insertAnswer(input: InsertAnswerInput): void {
  try {
    db.insert(dialogAnswers)
      .values({
        sessionId: input.sessionId,
        stepId: input.stepId,
        answerValue: input.answerValue,
        answerLabel: input.answerLabel ?? null,
        scoreAdded: input.scoreAdded ?? 0,
      })
      .run();
  } catch (error) {
    log.error("Failed to insert answer", error, {
      sessionId: input.sessionId,
      stepId: input.stepId,
    });
    throw error;
  }
}

export function getAnswersBySession(sessionId: number): AnswerRow[] {
  try {
    return db
      .select()
      .from(dialogAnswers)
      .where(eq(dialogAnswers.sessionId, sessionId))
      .orderBy(dialogAnswers.createdAt)
      .all();
  } catch (error) {
    log.error("Failed to get answers by session", error, { sessionId });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Expired sessions query
// ---------------------------------------------------------------------------

export function getExpiredSessions(
  reminderAfterMinutes: number,
  timeoutMinutes: number
): ExpiredSession[] {
  try {
    const now = Math.floor(Date.now() / 1000);
    const reminderThreshold = now - reminderAfterMinutes * 60;
    const timeoutThreshold = now - timeoutMinutes * 60;

    return db
      .select({
        id: dialogSessions.id,
        dialogId: dialogSessions.dialogId,
        provider: dialogSessions.provider,
        contact: dialogSessions.contact,
        currentStepId: dialogSessions.currentStepId,
        state: dialogSessions.state,
        reminderSentAt: dialogSessions.reminderSentAt,
        updatedAt: dialogSessions.updatedAt,
      })
      .from(dialogSessions)
      .where(
        and(
          eq(dialogSessions.state, "active"),
          sql`${dialogSessions.updatedAt} < ${reminderThreshold}`
        )
      )
      .all()
      .map((row) => ({
        ...row,
        _needsTimeout:
          row.updatedAt instanceof Date
            ? row.updatedAt.getTime() / 1000 < timeoutThreshold
            : Number(row.updatedAt) < timeoutThreshold,
      }))
      .filter((row) => row._needsTimeout || row.reminderSentAt === null)
      .map(({ _needsTimeout, ...rest }) => rest);
  } catch (error) {
    log.error("Failed to get expired sessions", error);
    return [];
  }
}
