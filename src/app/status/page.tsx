import { resolveSettings } from "@/domain/settings/settings-service";
import { getGowaHealth } from "./gowa-health";
import { GowaHealthCard } from "./gowa-health-card";
import { getMqttStatus } from "./mqtt-status";
import { MqttStatusCard } from "./mqtt-status-card";
import { getProviderStatuses } from "./provider-status";
import { StatusDashboard } from "./status-dashboard";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const cfg = await resolveSettings();
  const providers = getProviderStatuses(cfg);
  const mqtt = getMqttStatus();
  const gowa = await getGowaHealth(cfg);

  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-4">
      <StatusDashboard providers={providers} />
      <GowaHealthCard status={gowa} />
      <MqttStatusCard status={mqtt} />
    </div>
  );
}
