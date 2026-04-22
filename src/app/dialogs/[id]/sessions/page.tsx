import { desc, eq, sql } from "drizzle-orm";
import {
  PaginationControls,
  parsePage,
} from "@/components/pagination-controls";
import { getDialogById } from "@/domain/dialog/dialog-repository";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions } from "@/lib/db/schema";
import { SessionTable } from "./session-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id: idRaw } = await params;
  const resolvedSearch = await searchParams;
  const id = Number(idRaw);
  const dialog = getDialogById(id);

  if (!dialog) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Dialog nicht gefunden</p>
      </div>
    );
  }

  const { page } = parsePage({
    value: resolvedSearch.page,
    defaultPageSize: PAGE_SIZE,
  });
  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(dialogSessions)
    .where(eq(dialogSessions.dialogId, id))
    .get();
  const totalSessions = Number(totalRow?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalSessions / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), totalPages);

  const sessions = db
    .select()
    .from(dialogSessions)
    .where(eq(dialogSessions.dialogId, id))
    .orderBy(desc(dialogSessions.updatedAt))
    .limit(PAGE_SIZE)
    .offset((clampedPage - 1) * PAGE_SIZE)
    .all();

  const sessionsWithAnswers = sessions.map((session) => {
    const answers = db
      .select()
      .from(dialogAnswers)
      .where(eq(dialogAnswers.sessionId, session.id))
      .orderBy(dialogAnswers.createdAt)
      .all();

    const variables: Record<string, string> = (() => {
      try {
        return JSON.parse(session.variables) as Record<string, string>;
      } catch {
        return {};
      }
    })();

    return {
      ...session,
      variables,
      answers,
    };
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <SessionTable
        dialogId={id}
        dialogName={dialog.name}
        sessions={sessionsWithAnswers}
      />
      <PaginationControls
        basePath={`/dialogs/${id}/sessions`}
        currentPage={clampedPage}
        pageSize={PAGE_SIZE}
        searchParams={resolvedSearch}
        totalItems={totalSessions}
      />
    </div>
  );
}
