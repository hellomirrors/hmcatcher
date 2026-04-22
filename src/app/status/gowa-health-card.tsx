import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GowaHealthStatus } from "./gowa-health";

function deviceIdBadge(
  status: GowaHealthStatus
): "default" | "secondary" | "destructive" | "outline" {
  if (!status.reachable) {
    return "outline";
  }
  if (status.deviceIdValid && status.loggedIn) {
    return "default";
  }
  if (status.deviceIdValid) {
    return "secondary";
  }
  return "destructive";
}

function deviceIdLabel(status: GowaHealthStatus): string {
  if (!status.reachable) {
    return "Nicht prüfbar";
  }
  if (status.deviceIdValid && status.loggedIn) {
    return "Session aktiv, WhatsApp gekoppelt";
  }
  if (status.deviceIdValid) {
    return "Session aktiv, kein WhatsApp gekoppelt";
  }
  return "Session unbekannt";
}

export function GowaHealthCard({ status }: { status: GowaHealthStatus }) {
  if (!status.configured) {
    return null;
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>GoWA — Device-Status</CardTitle>
        <CardDescription>
          Prüft live, ob die konfigurierte Session-UUID vom GoWA-Server
          akzeptiert wird und ob WhatsApp-Geräte gekoppelt sind.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Erreichbar</span>
          <Badge variant={status.reachable ? "default" : "destructive"}>
            {status.reachable ? "Ja" : "Nein"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Device-ID</span>
          <Badge variant={deviceIdBadge(status)}>{deviceIdLabel(status)}</Badge>
        </div>
        {status.configuredDeviceId && (
          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">
              Konfigurierte Device-ID
            </span>
            <code className="break-all rounded-md bg-muted px-2 py-1 text-xs">
              {status.configuredDeviceId}
            </code>
          </div>
        )}
        {status.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-1 font-medium text-destructive text-xs">Fehler</p>
            <code className="break-all text-xs">{status.error}</code>
          </div>
        )}
        {status.reachable && status.knownDevices.length > 0 && (
          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">
              Gekoppelte WhatsApp-Geräte
            </span>
            <ul className="grid gap-1">
              {status.knownDevices.map((d) => (
                <li
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs"
                  key={d.deviceId}
                >
                  <code className="break-all">{d.deviceId}</code>
                  <Badge variant="outline">{d.state}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
