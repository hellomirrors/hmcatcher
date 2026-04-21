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
} from "@/domain/leads/lead-stats";
import { DashboardClient, type DashboardPayload } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function LeadDashboardPage() {
  const dialogOptions = listDialogOptions();
  const activeDialog = getActiveDialog();
  const dialogId = activeDialog?.id ?? dialogOptions[0]?.id;

  const filter: StatsFilter = { range: "24h", dialogId };

  const payload: DashboardPayload = {
    range: "24h",
    dialogId: dialogId ?? null,
    dialogOptions,
    summary: getSummaryStats(filter),
    timeSeries: getLeadsTimeSeries(filter),
    trophy: getTrophyDistribution(filter),
    bucket: getBucketDistribution(filter),
    rolle: getVariableDistribution("rolle_label", filter),
    einrichtungstyp: getVariableDistribution("einrichtungstyp_label", filter),
    funnel: getFunnelByPhase(filter),
    topWinners: getTopPrizeWinners(filter, 20),
    generatedAt: new Date().toISOString(),
  };

  return <DashboardClient initial={payload} />;
}
