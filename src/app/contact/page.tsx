import { readConfiguration } from "@/domain/configuration/configuration-service";
import { ContactForm } from "./contact-form";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const provider = typeof params.p === "string" ? params.p : "";
  const userId = typeof params.u === "string" ? params.u : "";

  if (!(provider && userId)) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">
          Ungültiger Link. Bitte starte die Konversation im Chat neu.
        </p>
      </div>
    );
  }

  const config = await readConfiguration();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <ContactForm provider={provider} roles={config.roles} userId={userId} />
    </div>
  );
}
