import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MqttStatus } from "./mqtt-status";

function connectionVariant(
  status: MqttStatus
): "default" | "secondary" | "destructive" {
  if (status.connected) {
    return "default";
  }
  if (status.configured) {
    return "secondary";
  }
  return "destructive";
}

export function MqttStatusCard({ status }: { status: MqttStatus }) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>MQTT-Broker</CardTitle>
        <CardDescription>
          Verbindung zum MQTT-Broker für Slot-Trigger und Reflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Konfiguriert</span>
          <Badge variant={status.configured ? "default" : "destructive"}>
            {status.configured ? "Ja" : "Nein"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Verbindung</span>
          <Badge variant={connectionVariant(status)}>
            {status.connected ? "Verbunden" : "Nicht verbunden"}
          </Badge>
        </div>
        {status.url && (
          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">URL</span>
            <code className="break-all rounded-md bg-muted px-2 py-1 text-xs">
              {status.url}
            </code>
          </div>
        )}
        {!status.configured && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="font-medium text-destructive text-xs">
              Fehlende Umgebungsvariablen:
            </p>
            <code className="mr-2 text-xs">MQTT_URL</code>
            <code className="mr-2 text-xs">MQTT_USERNAME</code>
            <code className="text-xs">MQTT_PASSWORD</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
