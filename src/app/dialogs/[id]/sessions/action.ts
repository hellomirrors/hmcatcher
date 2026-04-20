"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions, leads } from "@/lib/db/schema";

export const deleteSessionAction = async (sessionId: number): Promise<void> => {
  await Promise.resolve();
  // Leads outlive sessions: drop the FK link instead of deleting the lead.
  db.update(leads)
    .set({ sessionId: null })
    .where(eq(leads.sessionId, sessionId))
    .run();
  db.delete(dialogAnswers).where(eq(dialogAnswers.sessionId, sessionId)).run();
  db.delete(dialogSessions).where(eq(dialogSessions.id, sessionId)).run();
  revalidatePath("/dialogs");
};

export const deleteAllSessionsForDialogAction = async (
  dialogId: number
): Promise<{ deleted: number }> => {
  await Promise.resolve();
  const sessions = db
    .select({ id: dialogSessions.id })
    .from(dialogSessions)
    .where(eq(dialogSessions.dialogId, dialogId))
    .all();
  const ids = sessions.map((s) => s.id);
  if (ids.length === 0) {
    return { deleted: 0 };
  }
  db.update(leads)
    .set({ sessionId: null })
    .where(inArray(leads.sessionId, ids))
    .run();
  db.delete(dialogAnswers).where(inArray(dialogAnswers.sessionId, ids)).run();
  db.delete(dialogSessions).where(eq(dialogSessions.dialogId, dialogId)).run();
  revalidatePath("/dialogs");
  return { deleted: ids.length };
};
