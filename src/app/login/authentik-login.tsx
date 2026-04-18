import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authentikLoginAction } from "./action";

export function AuthentikLogin({
  from,
  error,
}: {
  from: string;
  error?: string;
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Admin-Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={authentikLoginAction} className="grid gap-4">
          <input name="from" type="hidden" value={from} />
          {error === "forbidden" && (
            <p className="text-destructive text-sm">
              Kein Zugriff. Admin-Gruppe erforderlich.
            </p>
          )}
          <Button type="submit">Mit Authentik anmelden</Button>
        </form>
      </CardContent>
    </Card>
  );
}
