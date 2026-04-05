import { getProviderStatuses } from "./provider-status";
import { StatusDashboard } from "./status-dashboard";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const providers = await getProviderStatuses();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <StatusDashboard providers={providers} />
    </div>
  );
}
