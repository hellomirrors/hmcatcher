import { Card, CardContent } from "@/components/ui/card";
import { resolveSettings } from "@/domain/settings/settings-service";

export const dynamic = "force-dynamic";

const TRIGGER_TEXT = "start";

function cleanPhone(raw: string): string {
  return raw.replace(/[\s+\-()]/g, "");
}

function formatPhone(raw: string): string {
  const cleaned = cleanPhone(raw);
  return cleaned ? `+${cleaned}` : "";
}

export default async function StartQrPage() {
  const settings = await resolveSettings();
  const phone = cleanPhone(settings.gowaPhoneNumber);

  if (!phone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6 text-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-destructive">
              GOWA_PHONE_NUMBER ist nicht konfiguriert. Bitte in den
              Einstellungen oder per Umgebungsvariable setzen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(TRIGGER_TEXT)}`;
  const qrSrc = `/api/qr?content=${encodeURIComponent(waUrl)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-center">
      <div className="space-y-2">
        <h1 className="font-bold text-4xl">Felix Jackpot</h1>
        <p className="text-lg text-muted-foreground">
          QR-Code scannen und am Gewinnspiel teilnehmen
        </p>
      </div>
      <Card>
        <CardContent className="p-8">
          {/* biome-ignore lint/performance/noImgElement: generated QR, not a static asset */}
          <img
            alt="WhatsApp Start QR"
            className="size-[420px]"
            height={420}
            src={qrSrc}
            width={420}
          />
        </CardContent>
      </Card>
      <div className="space-y-1 text-muted-foreground">
        <p>
          Nach dem Scan öffnet sich WhatsApp mit dem Text
          <span className="mx-2 rounded bg-muted px-2 py-0.5 font-mono text-foreground">
            {TRIGGER_TEXT}
          </span>
          — einfach auf &bdquo;Senden&ldquo; tippen.
        </p>
        <p className="font-mono text-sm">
          {formatPhone(settings.gowaPhoneNumber)}
        </p>
      </div>
    </div>
  );
}
