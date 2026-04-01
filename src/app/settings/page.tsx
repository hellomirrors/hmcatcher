import { readSettings } from "@/domain/settings/settings-service";
import { getEnvStatus } from "./action";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, envGroups] = await Promise.all([
    readSettings(),
    getEnvStatus(),
  ]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <SettingsForm envGroups={envGroups} settings={settings} />
    </div>
  );
}
