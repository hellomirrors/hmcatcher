import { readConfiguration } from "@/domain/configuration/configuration-service";
import { ConfigurationForm } from "./configuration-form";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const config = await readConfiguration();

  return <ConfigurationForm config={config} />;
}
