import { getActiveDialog } from "@/domain/dialog/dialog-repository";
import {
  getBucketDistribution,
  getFunnelByPhase,
  getLeadsTimeSeries,
  getSummaryStats,
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

  const filter: StatsFilter = { range: "7d", dialogId };

  const payload: DashboardPayload = {
    range: "7d",
    dialogId: dialogId ?? null,
    dialogOptions,
    summary: getSummaryStats(filter),
    timeSeries: getLeadsTimeSeries(filter),
    bucket: getBucketDistribution(filter),
    arbeitsbereich: getVariableDistribution("arbeitsbereich_label", filter),
    rolle: getVariableDistribution("rolle_label", filter),
    einrichtungstyp: getVariableDistribution("einrichtungstyp_label", filter),
    funnel: getFunnelByPhase(filter),
    generatedAt: new Date().toISOString(),
  };

  return <DashboardClient initial={payload} />;
}
