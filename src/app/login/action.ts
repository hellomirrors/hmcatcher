"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_PASSWORD = "Cortex@2022";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const password = formData.get("password");
  const from = formData.get("from");

  if (password !== ADMIN_PASSWORD) {
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

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-auth");
  redirect("/");
}
