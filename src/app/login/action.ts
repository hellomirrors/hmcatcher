"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { AUTH_MODE } from "@/lib/auth-mode";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const password = formData.get("password");
  const from = formData.get("from");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { error: "ADMIN_PASSWORD nicht konfiguriert" };
  }
  if (password !== expected) {
    return { error: "Falsches Passwort" };
  }

  const cookieStore = await cookies();
  cookieStore.set("admin-auth", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(typeof from === "string" && from ? from : "/admin");
}

export async function authentikLoginAction(formData: FormData) {
  const from = formData.get("from");
  await signIn("authentik", {
    redirectTo: typeof from === "string" && from ? from : "/admin",
  });
}

export async function logoutAction() {
  if (AUTH_MODE === "authentik") {
    await signOut({ redirectTo: "/" });
    return;
  }
  const cookieStore = await cookies();
  cookieStore.delete("admin-auth");
  redirect("/");
}
