import Link from "next/link";
import {
  PaginationControls,
  parsePage,
} from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countContacts, listContacts } from "@/domain/messaging/message-log";
import { formatDateTime } from "@/lib/format-time";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface ConversationsSearchParams {
  page?: string;
  [key: string]: string | undefined;
}

export default async function ConversationsPage(props: {
  searchParams: Promise<ConversationsSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const { page } = parsePage({
    value: searchParams.page,
    defaultPageSize: PAGE_SIZE,
  });
  const totalContacts = countContacts();
  const totalPages = Math.max(1, Math.ceil(totalContacts / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const contacts = listContacts({
    limit: PAGE_SIZE,
    offset: (clampedPage - 1) * PAGE_SIZE,
  });

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
          {totalContacts === 0 ? (
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
                      {formatDateTime(c.lastAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <PaginationControls
            basePath="/conversations"
            currentPage={clampedPage}
            pageSize={PAGE_SIZE}
            searchParams={searchParams}
            totalItems={totalContacts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
