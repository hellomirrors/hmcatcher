import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TopWinner } from "@/domain/leads/lead-stats";

interface TopWinsTableProps {
  data: TopWinner[];
}

const trophyLabel: Record<NonNullable<TopWinner["trophy"]>, string> = {
  jackpot: "Jackpot",
  drink: "Drink",
  candy: "Candy",
};

const trophyVariant: Record<
  NonNullable<TopWinner["trophy"]>,
  "default" | "secondary" | "outline"
> = {
  jackpot: "default",
  drink: "secondary",
  candy: "outline",
};

function formatTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date);
}

function winnerName(w: TopWinner): string {
  const parts = [w.vorname, w.nachname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : w.contact;
}

export function TopWinsTable({ data }: TopWinsTableProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Letzte Gewinne</CardTitle>
        <CardDescription>
          Die letzten ausgespielten Preise im Zeitraum.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Noch keine Gewinne im Zeitraum.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground text-xs">
                <tr>
                  <th className="py-2 pr-3">Zeit</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Kontakt</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Preis</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((w) => (
                  <tr key={`${w.leadId}-${w.trophy}`}>
                    <td className="py-1.5 pr-3 text-muted-foreground text-xs tabular-nums">
                      {formatTime(w.completedAt)}
                    </td>
                    <td className="py-1.5 pr-3 font-medium">{winnerName(w)}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground text-xs">
                      {w.contact}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Badge variant="outline">{w.provider}</Badge>
                    </td>
                    <td className="py-1.5 pr-3">
                      {w.trophy ? (
                        <Badge variant={trophyVariant[w.trophy]}>
                          {trophyLabel[w.trophy]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
