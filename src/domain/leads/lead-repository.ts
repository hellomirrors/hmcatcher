import { and, desc, eq, gte, like, lte, or, type SQL, sql } from "drizzle-orm";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { resolveBucket } from "@/domain/dialog/score-buckets";
import { db } from "@/lib/db";
import { dialogs, leads } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("lead-repository");

export interface LeadRow {
  bucket: string | null;
  completedAt: Date | null;
  consentAt: Date;
  contact: string;
  createdAt: Date;
  dialogId: number | null;
  email: string | null;
  id: number;
  nachname: string | null;
  plz: string | null;
  provider: string;
  score: number;
  sessionId: number | null;
  state: string;
  updatedAt: Date;
  variables: Record<string, string>;
  vorname: string | null;
}

export interface LeadListItem extends LeadRow {
  dialogName: string | null;
}

export interface LeadFilters {
  bucket?: string;
  dialogId?: number;
  fromDate?: Date;
  search?: string;
  state?: string;
  toDate?: Date;
}

interface UpsertInput {
  contact: string;
  definition: DialogDefinition;
  dialogDbId: number;
  provider: string;
  score: number;
  sessionDbId: number;
  state: "active" | "completed";
  variables: Record<string, string>;
}

function parseVariables(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function rowToLead(row: typeof leads.$inferSelect): LeadRow {
  return {
    id: row.id,
    sessionId: row.sessionId,
    dialogId: row.dialogId,
    provider: row.provider,
    contact: row.contact,
    vorname: row.vorname,
    nachname: row.nachname,
    email: row.email,
    plz: row.plz,
    score: row.score,
    bucket: row.bucket,
    variables: parseVariables(row.variables),
    state: row.state,
    consentAt: row.consentAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Insert or update a lead row that mirrors the current dialog session state.
 * Bucket is computed from score using the dialog's scoreBuckets.
 */
export function upsertLeadFromSession(input: UpsertInput): void {
  try {
    const existing = db
      .select()
      .from(leads)
      .where(eq(leads.sessionId, input.sessionDbId))
      .get();

    const bucket =
      resolveBucket(input.score, input.definition.scoreBuckets)?.id ?? null;
    const vorname = input.variables.vorname ?? null;
    const nachname = input.variables.nachname ?? null;
    const email = input.variables.email ?? null;
    const plz = input.variables.plz ?? null;
    const now = new Date();

    if (existing) {
      db.update(leads)
        .set({
          provider: input.provider,
          contact: input.contact,
          vorname,
          nachname,
          email,
          plz,
          score: input.score,
          bucket,
          variables: JSON.stringify(input.variables),
          state: input.state,
          completedAt:
            input.state === "completed" ? (existing.completedAt ?? now) : null,
          updatedAt: now,
        })
        .where(eq(leads.id, existing.id))
        .run();
      return;
    }

    db.insert(leads)
      .values({
        sessionId: input.sessionDbId,
        dialogId: input.dialogDbId,
        provider: input.provider,
        contact: input.contact,
        vorname,
        nachname,
        email,
        plz,
        score: input.score,
        bucket,
        variables: JSON.stringify(input.variables),
        state: input.state,
        completedAt: input.state === "completed" ? now : null,
      })
      .run();
  } catch (error) {
    log.error("Failed to upsert lead from session", error, {
      sessionDbId: input.sessionDbId,
      dialogDbId: input.dialogDbId,
    });
  }
}

export function getLeadById(id: number): LeadRow | undefined {
  try {
    const row = db.select().from(leads).where(eq(leads.id, id)).get();
    if (!row) {
      return;
    }
    return rowToLead(row);
  } catch (error) {
    log.error("Failed to get lead", error, { id });
    return;
  }
}

export function listLeads(filters: LeadFilters = {}): LeadListItem[] {
  try {
    const where: SQL[] = [];
    if (filters.dialogId !== undefined) {
      where.push(eq(leads.dialogId, filters.dialogId));
    }
    if (filters.bucket) {
      where.push(eq(leads.bucket, filters.bucket));
    }
    if (filters.state) {
      where.push(eq(leads.state, filters.state));
    }
    if (filters.fromDate) {
      where.push(gte(leads.consentAt, filters.fromDate));
    }
    if (filters.toDate) {
      where.push(lte(leads.consentAt, filters.toDate));
    }
    if (filters.search) {
      const needle = `%${filters.search}%`;
      const search = or(
        like(leads.vorname, needle),
        like(leads.nachname, needle),
        like(leads.email, needle),
        like(leads.contact, needle)
      );
      if (search) {
        where.push(search);
      }
    }

    const rows = db
      .select({
        lead: leads,
        dialogName: dialogs.name,
      })
      .from(leads)
      .leftJoin(dialogs, eq(leads.dialogId, dialogs.id))
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .orderBy(desc(leads.consentAt))
      .all();

    return rows.map((r) => ({
      ...rowToLead(r.lead),
      dialogName: r.dialogName,
    }));
  } catch (error) {
    log.error("Failed to list leads", error);
    return [];
  }
}

export function getDistinctDialogIds(): { id: number; name: string }[] {
  try {
    return db
      .select({ id: dialogs.id, name: dialogs.name })
      .from(dialogs)
      .all();
  } catch (error) {
    log.error("Failed to list dialogs for filter", error);
    return [];
  }
}
