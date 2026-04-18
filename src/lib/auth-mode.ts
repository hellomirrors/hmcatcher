export type AuthMode = "authentik" | "cookie";

export const AUTH_MODE: AuthMode = process.env.AUTHENTIK_ISSUER
  ? "authentik"
  : "cookie";

export const ADMIN_GROUP = process.env.AUTHENTIK_ADMIN_GROUP ?? "Messe Admins";

export function isAdmin(groups: string[] | undefined): boolean {
  return !!groups && groups.includes(ADMIN_GROUP);
}
