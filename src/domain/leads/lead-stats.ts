import { and, desc, eq, gte, inArray, type SQL, sql } from "drizzle-orm";
import { getDialogById } from "@/domain/dialog/dialog-repository";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions, dialogs, leads } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("lead-stats");

export type StatsRange =
  | "1h"
  | "2h"
  | "4h"
  | "8h"
  | "12h"
  | "16h"
  | "24h"
  | "7d"
  | "30d"
  | "all";

export interface StatsFilter {
  dialogId?: number;
  range: StatsRange;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const RANGE_MS: Record<Exclude<StatsRange, "all">, number> = {
  "1h": HOUR_MS,
  "2h": 2 * HOUR_MS,
  "4h": 4 * HOUR_MS,
  "8h": 8 * HOUR_MS,
  "12h": 12 * HOUR_MS,
  "16h": 16 * HOUR_MS,
  "24h": 24 * HOUR_MS,
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
};

function rangeStart(range: StatsRange): Date | null {
  if (range === "all") {
    return null;
  }
  return new Date(Date.now() - RANGE_MS[range]);
}

type BucketUnit = "min5" | "min15" | "hour" | "day" | "week";

function bucketUnit(range: StatsRange): BucketUnit {
  if (range === "1h" || range === "2h") {
    return "min5";
  }
  if (range === "4h" || range === "8h") {
    return "min15";
  }
  if (range === "12h" || range === "16h" || range === "24h") {
    return "hour";
  }
  if (range === "all") {
    return "week";
  }
  return "day";
}

function bucketSeconds(unit: BucketUnit): number {
  switch (unit) {
    case "min5":
      return 5 * 60;
    case "min15":
      return 15 * 60;
    case "hour":
      return 60 * 60;
    case "day":
      return 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
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
    const bucketSec = bucketSeconds(unit);
    const start = rangeStart(filter.range);

    const where: SQL[] = [];
    if (filter.dialogId !== undefined) {
      where.push(eq(leads.dialogId, filter.dialogId));
    }
    if (start) {
      where.push(gte(leads.consentAt, start));
    }

    // SQLite performs REAL division when the divisor is a bound parameter,
    // so we explicitly CAST the quotient to INTEGER before multiplying back
    // up to the bucket boundary. Without this every row lands in its own
    // "bucket" (= its own timestamp) and the dashboard chart stays flat.
    const bucketExpr = sql<number>`cast(${leads.consentAt} / ${bucketSec} as integer) * ${bucketSec}`;

    const rows = db
      .select({
        bucketSec: bucketExpr,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .groupBy(bucketExpr)
      .orderBy(bucketExpr)
      .all();

    const byBucket = new Map<number, number>();
    for (const row of rows) {
      byBucket.set(Number(row.bucketSec), Number(row.count));
    }

    if (!start) {
      return rows.map((r) => ({
        bucket: new Date(Number(r.bucketSec) * 1000).toISOString(),
        count: Number(r.count),
      }));
    }

    const result: TimeSeriesPoint[] = [];
    const stepSec = bucketSec;
    const startSec = Math.floor(start.getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    let cursor = Math.floor(startSec / stepSec) * stepSec;
    const end = Math.floor(nowSec / stepSec) * stepSec;
    while (cursor <= end) {
      result.push({
        bucket: new Date(cursor * 1000).toISOString(),
        count: byBucket.get(cursor) ?? 0,
      });
      cursor += stepSec;
    }
    return result;
  } catch (error) {
    log.error("Failed to get leads time series", error, { filter });
    return [];
  }
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
    const keyExpr = sql<string>`coalesce(json_extract(${leads.variables}, ${path}), '')`;
    const countExpr = sql<number>`count(*)`;
    const rows = db
      .select({
        key: keyExpr,
        count: countExpr,
      })
      .from(leads)
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .groupBy(keyExpr)
      .orderBy(desc(countExpr))
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

    const keyExpr = sql<string>`coalesce(${leads.bucket}, 'none')`;
    const countExpr = sql<number>`count(*)`;
    const rows = db
      .select({
        key: keyExpr,
        count: countExpr,
      })
      .from(leads)
      .where(where.length > 0 ? and(...where) : sql`1=1`)
      .groupBy(keyExpr)
      .orderBy(desc(countExpr))
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
