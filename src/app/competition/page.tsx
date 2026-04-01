import Image from "next/image";
import { readSettings } from "@/domain/settings/settings-service";

export const dynamic = "force-dynamic";

const TELEGRAM_BOT_USERNAME =
  process.env.TELEGRAM_BOT_USERNAME ?? "hmcatcher_bot";

function getWhatsAppPhoneNumber(provider: string): string {
  if (provider === "gowa") {
    return (
      process.env.GOWA_PHONE_NUMBER ?? process.env.WHATSAPP_PHONE_NUMBER ?? ""
    );
  }
  return process.env.WHATSAPP_PHONE_NUMBER ?? "";
}

export default async function CompetitionPage() {
  const settings = await readSettings();
  const whatsappPhone = getWhatsAppPhoneNumber(settings.whatsappProvider);

  const telegramLink = TELEGRAM_BOT_USERNAME
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=messe`
    : "";

  const whatsappLink = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=start`
    : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      <h1 className="text-center font-semibold text-3xl">
        Scanne den QR-Code und nimm teil!
      </h1>

      <div className="flex flex-wrap items-start justify-center gap-12">
        {telegramLink && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="font-medium text-xl">Telegram</h2>
            <a href={telegramLink} rel="noopener noreferrer" target="_blank">
              <Image
                alt="QR-Code für Telegram"
                height={300}
                src={`/api/qr?content=${encodeURIComponent(telegramLink)}`}
                unoptimized
                width={300}
              />
            </a>
            <p className="max-w-xs text-center text-muted-foreground text-sm">
              Öffne Telegram und chatte mit unserem Bot
            </p>
            <a
              className="break-all text-primary text-xs hover:underline"
              href={telegramLink}
              rel="noopener noreferrer"
              target="_blank"
            >
              {telegramLink}
            </a>
          </div>
        )}

        {whatsappLink && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="font-medium text-xl">WhatsApp</h2>
            <a href={whatsappLink} rel="noopener noreferrer" target="_blank">
              <Image
                alt="QR-Code für WhatsApp"
                height={300}
                src={`/api/qr?content=${encodeURIComponent(whatsappLink)}`}
                unoptimized
                width={300}
              />
            </a>
            <p className="max-w-xs text-center text-muted-foreground text-sm">
              Öffne WhatsApp und starte die Unterhaltung
            </p>
            <a
              className="break-all text-primary text-xs hover:underline"
              href={whatsappLink}
              rel="noopener noreferrer"
              target="_blank"
            >
              {whatsappLink}
            </a>
          </div>
        )}

        {!(telegramLink || whatsappLink) && (
          <p className="text-muted-foreground">
            Bitte konfiguriere TELEGRAM_BOT_USERNAME oder WHATSAPP_PHONE_NUMBER
            in den Umgebungsvariablen.
          </p>
        )}
      </div>
    </div>
  );
}
