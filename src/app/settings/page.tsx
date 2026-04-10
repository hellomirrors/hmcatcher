import { readSettings } from "@/domain/settings/settings-service";
import { getEnvFallbacks } from "./action";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, envFallbacks] = await Promise.all([
    readSettings(),
    getEnvFallbacks(),
  ]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <SettingsForm envFallbacks={envFallbacks} settings={settings} />
    </div>
  );
}
