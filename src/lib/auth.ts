import NextAuth, { type NextAuthConfig } from "next-auth";
import { AUTH_MODE } from "./auth-mode";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      groups: string[];
    };
  }
}

const authentikProvider = {
  id: "authentik",
  name: "Authentik",
  type: "oidc" as const,
  issuer: process.env.AUTHENTIK_ISSUER,
  clientId: process.env.AUTHENTIK_CLIENT_ID,
  clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
  client: {
    token_endpoint_auth_method: "client_secret_post" as const,
  },
  profile(profile: {
    sub: string;
    name?: string;
    preferred_username?: string;
    email?: string;
    picture?: string;
    groups?: string[];
  }) {
    return {
      id: profile.sub,
      name: profile.name ?? profile.preferred_username ?? null,
      email: profile.email ?? null,
      image: profile.picture ?? null,
      groups: profile.groups ?? [],
    };
  },
};

const config: NextAuthConfig = {
  providers: AUTH_MODE === "authentik" ? [authentikProvider] : [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.groups = (user as { groups?: string[] }).groups ?? [];
      }
      return token;
    },
    session({ session, token }) {
      session.user.groups = (token.groups as string[]) ?? [];
      return session;
    },
    authorized: ({ auth: session }) => !!session,
  },
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
