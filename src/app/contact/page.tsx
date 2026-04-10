import { readConfiguration } from "@/domain/configuration/configuration-service";
import { resolveSettings } from "@/domain/settings/settings-service";
import { ContactForm } from "./contact-form";

function getChatReturnUrl(
  provider: string,
  cfg: {
    gowaPhoneNumber: string;
    telegramBotUsername: string;
    whatsappPhoneNumber: string;
  }
): string {
  if (provider === "telegram") {
    return `https://t.me/${cfg.telegramBotUsername}`;
  }
  const phone =
    provider === "gowa"
      ? cfg.gowaPhoneNumber || cfg.whatsappPhoneNumber
      : cfg.whatsappPhoneNumber;
  return phone ? `https://wa.me/${phone}` : "";
}

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

  const [config, cfg] = await Promise.all([
    readConfiguration(),
    resolveSettings(),
  ]);
  const chatReturnUrl = getChatReturnUrl(provider, cfg);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <ContactForm
        chatReturnUrl={chatReturnUrl}
        provider={provider}
        roles={config.roles}
        userId={userId}
      />
    </div>
  );
}
