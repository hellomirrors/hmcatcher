import { randomBytes } from "node:crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface TokenEntry {
  createdAt: number;
  provider: string;
  userId: string;
}

const tokens = new Map<string, TokenEntry>();

function generateToken(): string {
  return randomBytes(6).toString("base64url");
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of tokens) {
    if (now - entry.createdAt > TOKEN_TTL_MS) {
      tokens.delete(key);
    }
  }
}

export function createContactToken(provider: string, userId: string): string {
  cleanup();
  const token = generateToken();
  tokens.set(token, { provider, userId, createdAt: Date.now() });
  return token;
}

export function resolveContactToken(
  token: string
): { provider: string; userId: string } | undefined {
  const entry = tokens.get(token);
  if (!entry) {
    return undefined;
  }
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    tokens.delete(token);
    return undefined;
  }
  return { provider: entry.provider, userId: entry.userId };
}
