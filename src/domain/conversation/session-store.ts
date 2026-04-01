import type { ConversationSession } from "./types";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const sessions = new Map<string, ConversationSession>();

function sessionKey(provider: string, userId: string): string {
  return `${provider}:${userId}`;
}

export function getSession(
  provider: string,
  userId: string
): ConversationSession | undefined {
  const key = sessionKey(provider, userId);
  const session = sessions.get(key);

  if (!session) {
    return undefined;
  }

  if (Date.now() - session.updatedAt.getTime() > SESSION_TTL_MS) {
    sessions.delete(key);
    return undefined;
  }

  return session;
}

export function setSession(
  provider: string,
  userId: string,
  session: ConversationSession
): void {
  const key = sessionKey(provider, userId);
  session.updatedAt = new Date();
  sessions.set(key, session);
}

export function deleteSession(provider: string, userId: string): void {
  const key = sessionKey(provider, userId);
  sessions.delete(key);
}
