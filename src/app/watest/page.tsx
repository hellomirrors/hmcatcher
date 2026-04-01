import { readSettings } from "@/domain/settings/settings-service";
import { SendForm } from "./send-form";

export const dynamic = "force-dynamic";

export default async function WatestPage() {
  const settings = await readSettings();
  const provider = process.env.MESSAGING_PROVIDER ?? settings.whatsappProvider;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <SendForm provider={provider} />
    </div>
  );
}
