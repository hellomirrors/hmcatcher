import { getActiveDialog } from "@/domain/dialog/dialog-repository";
import {
  getBucketDistribution,
  getFunnelByPhase,
  getLeadsTimeSeries,
  getSummaryStats,
  getVariableDistribution,
  listDialogOptions,
  type StatsFilter,
  type StatsRange,
} from "@/domain/leads/lead-stats";

export const dynamic = "force-dynamic";

const VALID_RANGES: ReadonlySet<StatsRange> = new Set<StatsRange>([
  "1h",
  "2h",
  "4h",
  "8h",
  "12h",
  "16h",
  "24h",
  "48h",
  "72h",
  "7d",
  "30d",
  "all",
]);

function parseRange(value: string | null): StatsRange {
  if (value && VALID_RANGES.has(value as StatsRange)) {
    return value as StatsRange;
  }
  return "7d";
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
  const bucket = getBucketDistribution(filter);
  const arbeitsbereich = getVariableDistribution(
    "arbeitsbereich_label",
    filter
  );
  const rolle = getVariableDistribution("rolle_label", filter);
  const einrichtungstyp = getVariableDistribution(
    "einrichtungstyp_label",
    filter
  );
  const funnel = getFunnelByPhase(filter);

  return new Response(
    JSON.stringify({
      range,
      dialogId: dialogId ?? null,
      dialogOptions,
      summary,
      timeSeries,
      bucket,
      arbeitsbereich,
      rolle,
      einrichtungstyp,
      funnel,
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
