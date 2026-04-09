import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listContacts } from "@/domain/messaging/message-log";

export const dynamic = "force-dynamic";

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function ConversationsPage() {
  const contacts = listContacts();

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Unterhaltungen</CardTitle>
          <CardDescription>
            Alle Kontakte mit gesendeten und empfangenen Nachrichten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Noch keine Nachrichten vorhanden.
            </p>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => (
                <li key={`${c.provider}:${c.contact}`}>
                  <Link
                    className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50"
                    href={`/conversations/${c.provider}/${encodeURIComponent(c.contact)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.contact}</span>
                        <Badge variant="outline">{c.provider}</Badge>
                        <Badge variant="secondary">{c.count}</Badge>
                      </div>
                      <p className="truncate text-muted-foreground text-xs">
                        {c.lastDirection === "out" ? "→ " : "← "}
                        {c.lastBody ?? "(kein Text)"}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(c.lastAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
