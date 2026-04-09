import { desc, eq } from "drizzle-orm";
import { getDialogById } from "@/domain/dialog/dialog-repository";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions } from "@/lib/db/schema";
import { SessionTable } from "./session-table";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  const dialog = getDialogById(id);

  if (!dialog) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Dialog nicht gefunden</p>
      </div>
    );
  }

  const sessions = db
    .select()
    .from(dialogSessions)
    .where(eq(dialogSessions.dialogId, id))
    .orderBy(desc(dialogSessions.updatedAt))
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
    <div className="mx-auto w-full max-w-4xl p-4">
      <SessionTable
        dialogId={id}
        dialogName={dialog.name}
        sessions={sessionsWithAnswers}
      />
    </div>
  );
}
