import Image from "next/image";
import { resolveSettings } from "@/domain/settings/settings-service";
import { RevealLink } from "./reveal-link";

export const dynamic = "force-dynamic";

export default async function CompetitionPage() {
  const cfg = await resolveSettings();

  const whatsappPhone =
    cfg.whatsappProvider === "gowa"
      ? cfg.gowaPhoneNumber || cfg.whatsappPhoneNumber
      : cfg.whatsappPhoneNumber;

  const telegramLink =
    cfg.showTelegramQr && cfg.telegramBotUsername
      ? `https://t.me/${cfg.telegramBotUsername}?start=messe`
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
            <RevealLink href={telegramLink} />
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
            <RevealLink href={whatsappLink} />
          </div>
        )}

        {!(telegramLink || whatsappLink) && (
          <p className="text-muted-foreground">
            Bitte konfiguriere die Telegram- oder WhatsApp-Einstellungen.
          </p>
        )}
      </div>
    </div>
  );
}
