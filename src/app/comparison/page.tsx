import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const options = [
  "GoWA + Chat",
  "GoWA + Webformular",
  "Cloud API + Chat",
  "Cloud API + Webformular",
  "Telegram + Chat",
  "Telegram + Webformular",
] as const;

type Rating = "yes" | "no" | "partial";

const YES = "yes" as const;
const NO = "no" as const;
const PARTIAL = "partial" as const;

const ratingIcon: Record<Rating, string> = {
  yes: "\u2705",
  no: "\u274C",
  partial: "\u26A0\uFE0F",
};

const ratingLabel: Record<Rating, string> = {
  yes: "Ja",
  no: "Nein",
  partial: "Teilweise",
};

interface Criterion {
  description: string;
  name: string;
  notes?: readonly [string, string, string, string, string, string];
  ratings: readonly [Rating, Rating, Rating, Rating, Rating, Rating];
}

const criteria: readonly Criterion[] = [
  {
    name: "Interaktive Elemente",
    description: "Native Buttons/Listen im Chat",
    ratings: [NO, YES, YES, YES, YES, YES],
    notes: [
      "Nur Text, keine Buttons",
      "Webformular hat native Inputs",
      "Buttons, Listen, Reply-Buttons",
      "Webformular hat native Inputs",
      "Inline-Buttons, Reply-Keyboards",
      "Webformular hat native Inputs",
    ],
  },
  {
    name: "QR-Code im Chat",
    description: "QR-Code wird direkt im Chat zugestellt",
    ratings: [YES, YES, YES, YES, YES, YES],
  },
  {
    name: "Kein App-Wechsel n\u00F6tig",
    description: "Nutzer bleibt durchgehend in einer App",
    ratings: [YES, NO, YES, NO, YES, NO],
    notes: [
      "",
      "Browser \u00F6ffnet sich f\u00FCr Formular",
      "",
      "Browser \u00F6ffnet sich f\u00FCr Formular",
      "",
      "Browser \u00F6ffnet sich f\u00FCr Formular",
    ],
  },
  {
    name: "Kanal bleibt offen",
    description: "Kanal f\u00FCr zuk\u00FCnftige Nachrichten nutzbar",
    ratings: [YES, YES, YES, YES, PARTIAL, PARTIAL],
    notes: [
      "",
      "",
      "",
      "",
      "Telegram weniger verbreitet",
      "Telegram weniger verbreitet",
    ],
  },
  {
    name: "Einrichtung / Stabilit\u00E4t",
    description: "Aufwand f\u00FCr Setup und Zuverl\u00E4ssigkeit",
    ratings: [PARTIAL, PARTIAL, PARTIAL, PARTIAL, YES, YES],
    notes: [
      "Self-hosted, Ger\u00E4t kann sich trennen",
      "Self-hosted, Ger\u00E4t kann sich trennen",
      "Komplexes Meta-Business-Setup",
      "Komplexes Meta-Business-Setup",
      "Einfaches BotFather-Setup",
      "Einfaches BotFather-Setup",
    ],
  },
  {
    name: "Kosten",
    description: "Laufende Kosten f\u00FCr den Betrieb",
    ratings: [YES, YES, PARTIAL, PARTIAL, YES, YES],
    notes: [
      "Kostenlos, self-hosted",
      "Kostenlos, self-hosted",
      "1.000 Gespr\u00E4che/Monat frei, dann kostenpflichtig",
      "1.000 Gespr\u00E4che/Monat frei, dann kostenpflichtig",
      "Kostenlos",
      "Kostenlos",
    ],
  },
  {
    name: "Datenschutz (DSGVO)",
    description: "Konformit\u00E4t mit EU-Datenschutzrecht",
    ratings: [PARTIAL, PARTIAL, PARTIAL, PARTIAL, PARTIAL, PARTIAL],
    notes: [
      "Self-hosted gut, aber Grauzone",
      "Self-hosted gut, aber Grauzone",
      "Meta verarbeitet Daten, AVV n\u00F6tig",
      "Meta verarbeitet Daten, AVV n\u00F6tig",
      "Server au\u00DFerhalb der EU",
      "Server au\u00DFerhalb der EU",
    ],
  },
  {
    name: "Nutzererlebnis",
    description: "Gesamte UX-Qualit\u00E4t des Ablaufs",
    ratings: [PARTIAL, YES, YES, YES, YES, YES],
    notes: [
      "Nur Text, keine Buttons",
      "Sauberes Formular, aber App-Wechsel",
      "Native Buttons, fl\u00FCssig",
      "Sauberes Formular",
      "Native Buttons",
      "Sauberes Formular",
    ],
  },
  {
    name: "Verbreitung bei Zielgruppe",
    description: "Nutzung in der deutschen Altenpflege-Branche",
    ratings: [YES, YES, YES, YES, NO, NO],
    notes: [
      "WhatsApp dominant in DE",
      "WhatsApp dominant in DE",
      "WhatsApp dominant in DE",
      "WhatsApp dominant in DE",
      "Geringe Verbreitung",
      "Geringe Verbreitung",
    ],
  },
] as const;

const ratingBgClass: Record<Rating, string> = {
  yes: "bg-green-50 dark:bg-green-950/30",
  no: "bg-red-50 dark:bg-red-950/30",
  partial: "bg-yellow-50 dark:bg-yellow-950/30",
};

export default function ComparisonPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-heading font-semibold text-2xl sm:text-3xl">
          Kommunikationsoptionen &mdash; Vergleich
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Vergleich aller Messaging-Optionen f&uuml;r das
          Messe-Kontakterfassungssystem hmcatcher.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-muted">
              <th className="px-3 py-3 text-left font-medium text-xs">
                Kriterium
              </th>
              {options.map((option) => (
                <th
                  className="px-3 py-3 text-center font-medium text-xs"
                  key={option}
                >
                  {option}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, rowIndex) => (
              <tr
                className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/40"}
                key={criterion.name}
              >
                <td className="px-3 py-3">
                  <div className="font-medium">{criterion.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {criterion.description}
                  </div>
                </td>
                {criterion.ratings.map((rating, colIndex) => (
                  <td
                    className={`px-3 py-3 text-center ${ratingBgClass[rating]}`}
                    key={`${criterion.name}-${options[colIndex]}`}
                  >
                    <span
                      aria-label={ratingLabel[rating]}
                      className="text-lg"
                      role="img"
                    >
                      {ratingIcon[rating]}
                    </span>
                    {criterion.notes?.[colIndex] ? (
                      <div className="mt-1 text-muted-foreground text-xs">
                        {criterion.notes[colIndex]}
                      </div>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-12">
        <h2 className="mb-6 font-heading font-semibold text-xl">
          Fazit &amp; Empfehlung
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Empfehlung 1</CardTitle>
              <CardDescription>WhatsApp Cloud API + Chat</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Beste UX dank nativer interaktiver Elemente (Buttons, Listen).
                Der Kanal bleibt f&uuml;r zuk&uuml;nftige Nachrichten offen und
                WhatsApp ist bei der Zielgruppe am weitesten verbreitet.
              </p>
              <p className="mt-2 text-muted-foreground">
                <strong>Nachteil:</strong> Komplexes Meta-Business-Setup,
                potenzielle Kosten ab 1.000 Gespr&auml;chen/Monat.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empfehlung 2</CardTitle>
              <CardDescription>GoWA + Webformular</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Beste pragmatische Alternative. Self-hosted, kostenlos und ein
                zuverl&auml;ssiges Webformular f&uuml;r die Datenerfassung. Der
                Nutzer verl&auml;sst kurz den Chat, kehrt aber f&uuml;r den
                QR-Code zur&uuml;ck.
              </p>
              <p className="mt-2 text-muted-foreground">
                <strong>Nachteil:</strong> App-Wechsel zum Browser,
                Ger&auml;teverbindung kann abreißen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empfehlung 3</CardTitle>
              <CardDescription>Dual-Setup</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Sowohl WhatsApp (prim&auml;r) als auch Telegram (Fallback) auf
                der Gewinnspiel-/Scan-Seite anbieten. Je nach
                Zuverl&auml;ssigkeit den passenden Kanal nutzen.
              </p>
              <p className="mt-2 text-muted-foreground">
                Die App unterst&uuml;tzt bereits den Wechsel zwischen Providern
                &mdash; ein Dual-Setup ist ohne gr&ouml;&szlig;eren Aufwand
                m&ouml;glich.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
