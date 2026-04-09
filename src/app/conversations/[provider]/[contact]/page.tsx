import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversation } from "@/domain/messaging/message-log";

export const dynamic = "force-dynamic";

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ provider: string; contact: string }>;
}) {
  const { provider, contact: contactRaw } = await params;
  const contact = decodeURIComponent(contactRaw);
  const items = getConversation(provider, contact);

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle>{contact}</CardTitle>
            <Badge variant="outline">{provider}</Badge>
          </div>
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            href="/conversations"
          >
            Zurück
          </Link>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Keine Nachrichten für diesen Kontakt.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((m) => {
                const isOut = m.direction === "out";
                return (
                  <li
                    className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                    key={m.id}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        isOut
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {m.kind === "template" && (
                        <p className="mb-1 font-semibold text-xs uppercase opacity-80">
                          Template: {m.templateName}
                        </p>
                      )}
                      {m.kind === "image" && (
                        <p className="mb-1 font-semibold text-xs uppercase opacity-80">
                          Bild (QR)
                        </p>
                      )}
                      {m.body && (
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      )}
                      {m.caption && (
                        <p className="mt-1 text-xs opacity-80">{m.caption}</p>
                      )}
                      <p className="mt-1 text-[10px] opacity-60">
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
