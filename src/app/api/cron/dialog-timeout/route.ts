import {
  getActiveDialog,
  getExpiredSessions,
  updateSession,
} from "@/domain/dialog/dialog-repository";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:dialog-timeout");

interface SessionRow {
  contact: string;
  id: number;
  provider: string;
  reminderSentAt: Date | null;
  updatedAt: Date;
}

async function expireSession(
  session: SessionRow,
  timeoutMessage: string | undefined
): Promise<void> {
  updateSession(session.id, { state: "expired" });
  if (!timeoutMessage) {
    return;
  }
  try {
    const provider = await createMessagingProvider(session.provider);
    await provider.sendText({ to: session.contact, body: timeoutMessage });
  } catch (error) {
    log.error("Failed to send timeout message", error, {
      sessionId: session.id,
    });
  }
}

async function remindSession(
  session: SessionRow,
  reminderMessage: string | undefined
): Promise<void> {
  updateSession(session.id, { reminderSentAt: new Date() });
  if (!reminderMessage) {
    return;
  }
  try {
    const provider = await createMessagingProvider(session.provider);
    await provider.sendText({ to: session.contact, body: reminderMessage });
  } catch (error) {
    log.error("Failed to send reminder", error, { sessionId: session.id });
  }
}

export async function GET(): Promise<Response> {
  const dialog = getActiveDialog();
  if (!dialog) {
    return Response.json({ ok: true, message: "No active dialog" });
  }

  const { definition } = dialog;
  const reminderMinutes = definition.reminderAfterMinutes ?? 0;
  const timeoutMinutes = definition.timeoutMinutes;

  const sessions = getExpiredSessions(reminderMinutes, timeoutMinutes);
  let reminded = 0;
  let expired = 0;

  for (const session of sessions) {
    const elapsedMinutes = (Date.now() - session.updatedAt.getTime()) / 60_000;

    if (elapsedMinutes >= timeoutMinutes) {
      await expireSession(session, definition.timeoutMessage);
      expired++;
    } else if (
      reminderMinutes > 0 &&
      elapsedMinutes >= reminderMinutes &&
      !session.reminderSentAt
    ) {
      await remindSession(session, definition.reminderMessage);
      reminded++;
    }
  }

  log.info("Timeout cron completed", { reminded, expired });
  return Response.json({ ok: true, reminded, expired });
}
