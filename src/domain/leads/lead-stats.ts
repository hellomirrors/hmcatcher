import { and, desc, eq, gte, inArray, type SQL, sql } from "drizzle-orm";
import { getDialogById } from "@/domain/dialog/dialog-repository";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions, dialogs, leads } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("lead-stats");

export type StatsRange = "24h" | "7d" | "30d" | "all";

export interface StatsFilter {
  dialogId?: number;
  range: StatsRange;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function rangeStart(range: StatsRange): Date | null {
  const now = Date.now();
  switch (range) {
    case "24h":
      return new Date(now - 24 * HOUR_MS);
    case "7d":
      return new Date(now - 7 * DAY_MS);
    case "30d":
      return new Date(now - 30 * DAY_MS);
    default:
      return null;
  }
}

type BucketUnit = "hour" | "day" | "week";

function bucketUnit(range: StatsRange): BucketUnit {
  if (range === "24h") {
    return "hour";
  }
  if (range === "all") {
    return "week";
  }
  return "day";
}

function bucketStepMs(unit: BucketUnit): number {
  if (unit === "hour") {
    return HOUR_MS;
  }
  if (unit === "day") {
    return DAY_MS;
  }
  return 7 * DAY_MS;
}

/** SQLite strftime format per bucket unit. */
function bucketFormat(unit: BucketUnit): string {
  if (unit === "hour") {
    return "%Y-%m-%d %H:00:00";
  }
  if (unit === "day") {
    return "%Y-%m-%d 00:00:00";
  }
  // %W = ISO week (00..53) — stable bucket key
  return "%Y-%W";
}

function truncateToBucket(date: Date, unit: BucketUnit): Date {
  const d = new Date(date.getTime());
  d.setUTCMinutes(0, 0, 0);
  if (unit === "hour") {
    return d;
  }
  d.setUTCHours(0, 0, 0, 0);
  if (unit === "day") {
    return d;
  }
  // Align to Monday
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface SummaryStats {
  abandonRate: number;
  avgScore: number;
  highValueWins: number;
  latestConsentAt: string | null;
  latestLeadId: number | null;
  totalCompleted: number;
  totalLeads: number;
  totalSessions: number;
}

export function getSummaryStats(filter: StatsFilter): SummaryStats {
  try {
    const start = rangeStart(filter.range);
    const leadWhere: SQL[] = [];
    const sessionWhere: SQL[] = [];
    if (filter.dialogId !== undefined) {
      leadWhere.push(eq(leads.dialogId, filter.dialogId));
      sessionWhere.push(eq(dialogSessions.dialogId, filter.dialogId));
    }
    if (start) {
      leadWhere.push(gte(leads.consentAt, start));
      sessionWhere.push(gte(dialogSessions.createdAt, start));
    }

    const leadStats = db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when ${leads.state} = 'completed' then 1 else 0 end)`,
        avgScore: sql<number>`coalesce(avg(${leads.score}), 0)`,
        jackpots: sql<number>`sum(case when json_extract(${leads.variables}, '$.trophy') = 'jackpot' then 1 else 0 end)`,
        latestId: sql<number>`coalesce(max(${leads.id}), 0)`,
        latestConsent: sql<number>`coalesce(max(${leads.consentAt}), 0)`,
      })
      .from(leads)
      .where(leadWhere.length > 0 ? and(...leadWhere) : sql`1=1`)
      .get();

    const sessionStats = db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(dialogSessions)
      .where(sessionWhere.length > 0 ? and(...sessionWhere) : sql`1=1`)
      .get();

    const totalLeads = Number(leadStats?.total ?? 0);
    const totalSessions = Number(sessionStats?.total ?? 0);
    const totalCompleted = Number(leadStats?.completed ?? 0);
    const highValueWins = Number(leadStats?.jackpots ?? 0);
    const avgScore = Number(leadStats?.avgScore ?? 0);
    const latestId = Number(leadStats?.latestId ?? 0);
    const latestConsentSec = Number(leadStats?.latestConsent ?? 0);

    const abandonRate = totalSessions > 0 ? 1 - totalLeads / totalSessions : 0;

    return {
      totalLeads,
      totalCompleted,
      totalSessions,
      highValueWins,
      avgScore,
      abandonRate: Math.max(0, Math.min(1, abandonRate)),
      latestLeadId: latestId > 0 ? latestId : null,
      latestConsentAt:
        latestConsentSec > 0
          ? new Date(latestConsentSec * 1000).toISOString()
          : null,
    };
  } catch (error) {
    log.error("Failed to get summary stats", error, { filter });
    return {
      totalLeads: 0,
      totalCompleted: 0,
      totalSessions: 0,
      highValueWins: 0,
      avgScore: 0,
      abandonRate: 0,
      latestLeadId: null,
      latestConsentAt: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

export interface TimeSeriesPoint {
  bucket: string;
  count: number;
}

export function getLeadsTimeSeries(filter: StatsFilter): TimeSeriesPoint[] {
  try {
    const unit = bucketUnit(filter.range);
    const start = rangeStart(filter.range);
    const format = bucketFormat(unit);

    const where: SQL[] = [];
    if (filter.dialogId !== undefined) {
      where.push(eq(leads.dialogId, filter.dialogId));
    }
    if (start) {
      where.push(gte(leads.consentAt, start));
    }

    const rows = db
      .select({
        bucket: sql<string>`strftime(${format}, ${leads.consentAt}, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .groupBy(sql`1`)
      .orderBy(sql`1`)
      .all();

    const byBucket = new Map<string, number>();
    for (const row of rows) {
      byBucket.set(String(row.bucket), Number(row.count));
    }

    if (!start) {
      return rows.map((r) => ({
        bucket: String(r.bucket),
        count: Number(r.count),
      }));
    }

    const result: TimeSeriesPoint[] = [];
    const step = bucketStepMs(unit);
    const now = new Date();
    let cursor = truncateToBucket(start, unit);
    const end = truncateToBucket(now, unit);
    while (cursor.getTime() <= end.getTime()) {
      const key = bucketKey(cursor, unit);
      result.push({
        bucket: cursor.toISOString(),
        count: byBucket.get(key) ?? 0,
      });
      cursor = new Date(cursor.getTime() + step);
    }
    return result;
  } catch (error) {
    log.error("Failed to get leads time series", error, { filter });
    return [];
  }
}

function bucketKey(date: Date, unit: BucketUnit): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  if (unit === "hour") {
    return `${y}-${m}-${d} ${h}:00:00`;
  }
  if (unit === "day") {
    return `${y}-${m}-${d} 00:00:00`;
  }
  // ISO week number approximation matching sqlite %W
  const start = new Date(Date.UTC(y, 0, 1));
  const week = Math.floor((date.getTime() - start.getTime()) / (7 * DAY_MS));
  return `${y}-${pad(week)}`;
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

export interface DistributionBucket {
  count: number;
  key: string;
}

export function getVariableDistribution(
  variableKey: string,
  filter: StatsFilter
): DistributionBucket[] {
  try {
    const start = rangeStart(filter.range);
    const where: SQL[] = [];
    if (filter.dialogId !== undefined) {
      where.push(eq(leads.dialogId, filter.dialogId));
    }
    if (start) {
      where.push(gte(leads.consentAt, start));
    }

    const path = `$.${variableKey}`;
    const rows = db
      .select({
        key: sql<string>`coalesce(json_extract(${leads.variables}, ${path}), '')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .groupBy(sql`1`)
      .orderBy(desc(sql`2`))
      .all();

    return rows
      .map((r) => ({ key: String(r.key ?? ""), count: Number(r.count) }))
      .filter((r) => r.key !== "");
  } catch (error) {
    log.error("Failed to get variable distribution", error, {
      filter,
      variableKey,
    });
    return [];
  }
}

export function getBucketDistribution(
  filter: StatsFilter
): DistributionBucket[] {
  try {
    const start = rangeStart(filter.range);
    const where: SQL[] = [];
    if (filter.dialogId !== undefined) {
      where.push(eq(leads.dialogId, filter.dialogId));
    }
    if (start) {
      where.push(gte(leads.consentAt, start));
    }

    const rows = db
      .select({
        key: sql<string>`coalesce(${leads.bucket}, 'none')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .groupBy(sql`1`)
      .orderBy(desc(sql`2`))
      .all();

    return rows.map((r) => ({
      key: String(r.key ?? "none"),
      count: Number(r.count),
    }));
  } catch (error) {
    log.error("Failed to get bucket distribution", error, { filter });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Trophy distribution (combines variables.trophy + reached gewinn-* steps)
// ---------------------------------------------------------------------------

export interface TrophyBucket {
  count: number;
  key: "jackpot" | "drink" | "candy" | "niete";
}

const TROPHY_STEPS: Record<TrophyBucket["key"], string> = {
  jackpot: "gewinn-jackpot",
  drink: "gewinn-drink",
  candy: "gewinn-candy",
  niete: "gewinn-niete",
};

export function getTrophyDistribution(filter: StatsFilter): TrophyBucket[] {
  try {
    const start = rangeStart(filter.range);
    const where: SQL[] = [];
    if (filter.dialogId !== undefined) {
      where.push(eq(dialogSessions.dialogId, filter.dialogId));
    }
    if (start) {
      where.push(gte(dialogSessions.createdAt, start));
    }

    const stepIds = Object.values(TROPHY_STEPS);
    const rows = db
      .select({
        stepId: dialogAnswers.stepId,
        count: sql<number>`count(distinct ${dialogAnswers.sessionId})`,
      })
      .from(dialogAnswers)
      .innerJoin(dialogSessions, eq(dialogAnswers.sessionId, dialogSessions.id))
      .where(
        and(
          inArray(dialogAnswers.stepId, stepIds),
          ...(where.length > 0 ? [and(...where) as SQL] : [])
        )
      )
      .groupBy(dialogAnswers.stepId)
      .all();

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(String(row.stepId), Number(row.count));
    }

    return (
      Object.entries(TROPHY_STEPS) as [TrophyBucket["key"], string][]
    ).map(([key, stepId]) => ({ key, count: counts.get(stepId) ?? 0 }));
  } catch (error) {
    log.error("Failed to get trophy distribution", error, { filter });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Funnel by dialog phase
// ---------------------------------------------------------------------------

export interface FunnelStage {
  count: number;
  key: string;
  label: string;
}

export function getFunnelByPhase(filter: StatsFilter): FunnelStage[] {
  try {
    const { dialogId } = filter;
    if (dialogId === undefined) {
      return [];
    }
    const dialog = getDialogById(dialogId);
    if (!dialog) {
      return [];
    }
    const start = rangeStart(filter.range);

    const sessionWhere: SQL[] = [eq(dialogSessions.dialogId, dialogId)];
    if (start) {
      sessionWhere.push(gte(dialogSessions.createdAt, start));
    }

    const sessionsStart = db
      .select({ count: sql<number>`count(*)` })
      .from(dialogSessions)
      .where(and(...sessionWhere))
      .get();
    const totalSessions = Number(sessionsStart?.count ?? 0);

    // Phases in order of first occurrence
    const phaseOrder: string[] = [];
    const stepsByPhase = new Map<string, string[]>();
    for (const step of dialog.definition.steps) {
      const phase = step.phase ?? "Ungruppiert";
      if (!stepsByPhase.has(phase)) {
        phaseOrder.push(phase);
        stepsByPhase.set(phase, []);
      }
      stepsByPhase.get(phase)?.push(step.id);
    }

    const phaseCounts: FunnelStage[] = [];
    for (const phase of phaseOrder) {
      const stepIds = stepsByPhase.get(phase) ?? [];
      if (stepIds.length === 0) {
        continue;
      }
      const row = db
        .select({
          count: sql<number>`count(distinct ${dialogAnswers.sessionId})`,
        })
        .from(dialogAnswers)
        .innerJoin(
          dialogSessions,
          eq(dialogAnswers.sessionId, dialogSessions.id)
        )
        .where(and(inArray(dialogAnswers.stepId, stepIds), ...sessionWhere))
        .get();
      phaseCounts.push({
        key: phase,
        label: phase,
        count: Number(row?.count ?? 0),
      });
    }

    const leadWhere: SQL[] = [eq(leads.dialogId, dialogId)];
    if (start) {
      leadWhere.push(gte(leads.consentAt, start));
    }
    const leadsRow = db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(...leadWhere))
      .get();
    const leadsCount = Number(leadsRow?.count ?? 0);

    return [
      { key: "__start", label: "Start (Sessions)", count: totalSessions },
      ...phaseCounts,
      { key: "__lead", label: "Lead erfasst", count: leadsCount },
    ];
  } catch (error) {
    log.error("Failed to get funnel by phase", error, { filter });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Top prize winners
// ---------------------------------------------------------------------------

export interface TopWinner {
  completedAt: string | null;
  contact: string;
  leadId: number;
  nachname: string | null;
  provider: string;
  trophy: "jackpot" | "drink" | "candy" | null;
  vorname: string | null;
}

export function getTopPrizeWinners(
  filter: StatsFilter,
  limit = 20
): TopWinner[] {
  try {
    const start = rangeStart(filter.range);
    const prizeSteps = ["gewinn-jackpot", "gewinn-drink", "gewinn-candy"];

    const where: SQL[] = [inArray(dialogAnswers.stepId, prizeSteps)];
    if (filter.dialogId !== undefined) {
      where.push(eq(leads.dialogId, filter.dialogId));
    }
    if (start) {
      where.push(gte(leads.consentAt, start));
    }

    const rows = db
      .select({
        leadId: leads.id,
        vorname: leads.vorname,
        nachname: leads.nachname,
        contact: leads.contact,
        provider: leads.provider,
        completedAt: leads.completedAt,
        stepId: dialogAnswers.stepId,
        answeredAt: dialogAnswers.createdAt,
      })
      .from(leads)
      .innerJoin(dialogAnswers, eq(dialogAnswers.sessionId, leads.sessionId))
      .where(and(...where))
      .orderBy(desc(dialogAnswers.createdAt))
      .limit(limit)
      .all();

    return rows.map((row) => {
      const completedIso =
        row.completedAt instanceof Date ? row.completedAt.toISOString() : null;
      const answeredIso =
        row.answeredAt instanceof Date ? row.answeredAt.toISOString() : null;
      const trophyByStep: Record<string, TopWinner["trophy"]> = {
        "gewinn-jackpot": "jackpot",
        "gewinn-drink": "drink",
        "gewinn-candy": "candy",
      };
      return {
        leadId: row.leadId,
        vorname: row.vorname,
        nachname: row.nachname,
        contact: row.contact,
        provider: row.provider,
        completedAt: completedIso ?? answeredIso,
        trophy: trophyByStep[row.stepId] ?? null,
      };
    });
  } catch (error) {
    log.error("Failed to get top prize winners", error, { filter });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dialog options (id + name) for filter dropdown
// ---------------------------------------------------------------------------

export interface DialogOption {
  id: number;
  name: string;
}

export function listDialogOptions(): DialogOption[] {
  try {
    return db
      .select({ id: dialogs.id, name: dialogs.name })
      .from(dialogs)
      .orderBy(dialogs.name)
      .all();
  } catch (error) {
    log.error("Failed to list dialog options", error);
    return [];
  }
}
