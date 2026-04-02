"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Settings } from "@/domain/settings/settings-schema";
import { type EnvVarGroup, updateSettingsAction } from "./action";

function SecretValue({ masked, isSet }: { isSet: boolean; masked: string }) {
  const [revealed, setRevealed] = useState(false);

  if (!isSet) {
    return <span className="font-medium text-destructive text-xs">fehlt</span>;
  }

  return (
    <button
      className="cursor-pointer select-all font-mono text-xs"
      onClick={() => setRevealed((v) => !v)}
      type="button"
    >
      {revealed ? masked : "*".repeat(masked.length || 8)}
    </button>
  );
}

function EnvGroupCard({ group }: { group: EnvVarGroup }) {
  return (
    <div className="grid gap-2">
      <h3 className="font-medium text-xs">{group.label}</h3>
      <div className="rounded-md border p-3">
        {group.vars.map((v) => (
          <div
            className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0"
            key={v.name}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-block size-1.5 rounded-full ${v.set ? "bg-primary" : "bg-destructive"}`}
              />
              <code className="text-xs">{v.name}</code>
            </div>
            <SecretValue isSet={v.set} masked={v.maskedValue} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsForm({
  settings,
  envGroups,
}: {
  envGroups: EnvVarGroup[];
  settings: Settings;
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, {
    success: false,
    settings,
  });

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
        <CardDescription>Konfiguration der Anwendung.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form action={formAction} className="grid gap-6">
          {state.success && (
            <p className="rounded-md bg-primary/10 p-2 text-primary text-xs">
              Einstellungen gespeichert.
            </p>
          )}
          {state.error && (
            <p className="rounded-md bg-destructive/10 p-2 text-destructive text-xs">
              {state.error}
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="whatsappProvider">WhatsApp Anbieter</Label>
            <Select
              defaultValue={state.settings?.whatsappProvider ?? "gowa"}
              name="whatsappProvider"
            >
              <SelectTrigger id="whatsappProvider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gowa">GoWA (go-whatsapp-web)</SelectItem>
                <SelectItem value="whatsapp">
                  WhatsApp (Meta Cloud API)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Welcher Dienst soll für WhatsApp-Nachrichten verwendet werden?
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="conversationMode">Konversationsmodus</Label>
            <Select
              defaultValue={state.settings?.conversationMode ?? "chat"}
              name="conversationMode"
            >
              <SelectTrigger id="conversationMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">
                  Chat (Datenerfassung im Chat)
                </SelectItem>
                <SelectItem value="webform">
                  Webformular (Link zum Formular)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Sollen Kontaktdaten im Chat oder über ein Webformular erfasst
              werden?
            </p>
          </div>

          <Button disabled={pending} size="lg" type="submit">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </form>

        <Separator />

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sm">Umgebungsvariablen</h2>
            <Badge variant="outline">
              {envGroups.flatMap((g) => g.vars).filter((v) => !v.set).length ===
              0
                ? "Alle gesetzt"
                : `${envGroups.flatMap((g) => g.vars).filter((v) => !v.set).length} fehlen`}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Klicke auf die Sternchen um Werte teilweise aufzudecken.
          </p>
          {envGroups.map((group) => (
            <EnvGroupCard group={group} key={group.label} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
