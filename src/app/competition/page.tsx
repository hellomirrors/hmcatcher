import Image from "next/image";

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "hmcatcher";
const WHATSAPP_PHONE_NUMBER =
  process.env.WHATSAPP_PHONE_NUMBER ?? "4917012345678";

const telegramLink = TELEGRAM_BOT_USERNAME
  ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=messe`
  : "";

const whatsappLink = WHATSAPP_PHONE_NUMBER
  ? `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=start`
  : "";

export default function CompetitionPage() {
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
