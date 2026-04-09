"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dialogAnswers, dialogSessions } from "@/lib/db/schema";

export const deleteSessionAction = async (sessionId: number): Promise<void> => {
  await Promise.resolve();
  db.delete(dialogAnswers).where(eq(dialogAnswers.sessionId, sessionId)).run();
  db.delete(dialogSessions).where(eq(dialogSessions.id, sessionId)).run();
  revalidatePath("/dialogs");
};
