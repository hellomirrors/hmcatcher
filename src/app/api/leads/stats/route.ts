import { getActiveDialog } from "@/domain/dialog/dialog-repository";
import {
  getBucketDistribution,
  getFunnelByPhase,
  getLeadsTimeSeries,
  getSummaryStats,
  getTopPrizeWinners,
  getTrophyDistribution,
  getVariableDistribution,
  listDialogOptions,
  type StatsFilter,
  type StatsRange,
} from "@/domain/leads/lead-stats";

export const dynamic = "force-dynamic";

const VALID_RANGES: ReadonlySet<StatsRange> = new Set<StatsRange>([
  "24h",
  "7d",
  "30d",
  "all",
]);

function parseRange(value: string | null): StatsRange {
  if (value && VALID_RANGES.has(value as StatsRange)) {
    return value as StatsRange;
  }
  return "24h";
}

function parseDialogId(value: string | null): number | undefined {
  if (!value || value === "active") {
    return;
  }
  if (value === "all") {
    return;
  }
  const id = Number(value);
  return Number.isNaN(id) ? undefined : id;
}

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range"));
  const dialogParam = url.searchParams.get("dialogId");
  const explicitDialog = parseDialogId(dialogParam);

  const dialogOptions = listDialogOptions();
  const fallbackDialogId = getActiveDialog()?.id ?? dialogOptions[0]?.id;
  const dialogId =
    dialogParam === "all" ? undefined : (explicitDialog ?? fallbackDialogId);

  const filter: StatsFilter = { range, dialogId };

  const summary = getSummaryStats(filter);
  const timeSeries = getLeadsTimeSeries(filter);
  const trophy = getTrophyDistribution(filter);
  const bucket = getBucketDistribution(filter);
  const rolle = getVariableDistribution("rolle_label", filter);
  const einrichtungstyp = getVariableDistribution(
    "einrichtungstyp_label",
    filter
  );
  const funnel = getFunnelByPhase(filter);
  const topWinners = getTopPrizeWinners(filter, 20);

  return new Response(
    JSON.stringify({
      range,
      dialogId: dialogId ?? null,
      dialogOptions,
      summary,
      timeSeries,
      trophy,
      bucket,
      rolle,
      einrichtungstyp,
      funnel,
      topWinners,
      generatedAt: new Date().toISOString(),
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
