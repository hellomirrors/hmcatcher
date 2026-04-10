"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./action";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin-Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <input name="from" type="hidden" value={from} />
            <div className="grid gap-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input
                autoFocus
                id="password"
                name="password"
                required
                type="password"
              />
            </div>
            {state?.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}
            <Button disabled={pending} type="submit">
              {pending ? "Prüfe..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
