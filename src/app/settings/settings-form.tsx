"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Settings } from "@/domain/settings/settings-schema";
import { type EnvFallbackInfo, updateSettingsAction } from "./action";

interface FieldProps {
  envFallbacks: Map<string, EnvFallbackInfo>;
  settings: Settings;
}

function SettingInput({
  envFallbacks,
  field,
  label,
  settings,
  type = "text",
}: FieldProps & { field: keyof Settings; label: string; type?: string }) {
  const value = settings[field] as string | undefined;
  const fallback = envFallbacks.get(field as string);

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field}>{label}</Label>
        {fallback && (
          <Badge
            className="text-[0.6rem]"
            variant={fallback.hasEnv ? "secondary" : "outline"}
          >
            {fallback.hasEnv
              ? `Fallback: ${fallback.envName}`
              : "kein Fallback"}
          </Badge>
        )}
      </div>
      <Input
        defaultValue={value ?? ""}
        id={field}
        name={field}
        placeholder={fallback?.hasEnv ? `Aus ${fallback.envName}` : ""}
        type={type}
      />
    </div>
  );
}

export function SettingsForm({
  settings,
  envFallbacks,
}: {
  envFallbacks: EnvFallbackInfo[];
  settings: Settings;
}) {
  const fallbackMap = new Map(envFallbacks.map((f) => [f.key, f]));
  const [state, formAction, pending] = useActionState(updateSettingsAction, {
    success: false,
    settings,
  });

  const s = state.settings ?? settings;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
        <CardDescription>
          Alle Werte werden in der Settings-Datei gespeichert.
          Umgebungsvariablen dienen nur als Fallback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-8">
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

          {/* Behavior */}
          <section className="grid gap-4">
            <h2 className="font-medium text-sm">Verhalten</h2>

            <div className="grid gap-1.5">
              <Label htmlFor="whatsappProvider">WhatsApp Anbieter</Label>
              <Select defaultValue={s.whatsappProvider} name="whatsappProvider">
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
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="whatsappPhoneMode">WhatsApp Telefonnummer</Label>
              <Select
                defaultValue={s.whatsappPhoneMode}
                name="whatsappPhoneMode"
              >
                <SelectTrigger id="whatsappPhoneMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live-Nummer</SelectItem>
                  <SelectItem value="test">Test-Nummer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="conversationMode">Konversationsmodus</Label>
              <Select defaultValue={s.conversationMode} name="conversationMode">
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
                  <SelectItem value="dialog">
                    Dialog (Konfigurierbare Flows)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="grid gap-0.5">
                <Label htmlFor="showTelegramQr">
                  Telegram QR-Code anzeigen
                </Label>
                <p className="text-muted-foreground text-xs">
                  QR-Code auf der Competition-Seite anzeigen
                </p>
              </div>
              <Switch
                defaultChecked={s.showTelegramQr}
                id="showTelegramQr"
                name="showTelegramQr"
              />
            </div>
          </section>

          <Separator />

          {/* Telegram */}
          <section className="grid gap-4">
            <h2 className="font-medium text-sm">Telegram</h2>
            <SettingInput
              envFallbacks={fallbackMap}
              field="telegramBotToken"
              label="Bot Token"
              settings={s}
              type="password"
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="telegramBotUsername"
              label="Bot Username"
              settings={s}
            />
          </section>

          <Separator />

          {/* WhatsApp Meta */}
          <section className="grid gap-4">
            <h2 className="font-medium text-sm">WhatsApp (Meta Cloud API)</h2>
            <SettingInput
              envFallbacks={fallbackMap}
              field="whatsappAccessToken"
              label="Access Token"
              settings={s}
              type="password"
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="whatsappPhoneNumberId"
              label="Phone Number ID"
              settings={s}
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="whatsappTestPhoneNumberId"
              label="Test Phone Number ID"
              settings={s}
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="whatsappWebhookVerifyToken"
              label="Webhook Verify Token"
              settings={s}
              type="password"
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="whatsappPhoneNumber"
              label="Telefonnummer (für Links)"
              settings={s}
            />
          </section>

          <Separator />

          {/* GoWA */}
          <section className="grid gap-4">
            <h2 className="font-medium text-sm">GoWA (go-whatsapp-web)</h2>
            <SettingInput
              envFallbacks={fallbackMap}
              field="gowaBaseUrl"
              label="Base URL"
              settings={s}
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="gowaUsername"
              label="Username"
              settings={s}
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="gowaPassword"
              label="Password"
              settings={s}
              type="password"
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="gowaDeviceId"
              label="Device ID"
              settings={s}
            />
            <SettingInput
              envFallbacks={fallbackMap}
              field="gowaPhoneNumber"
              label="Telefonnummer"
              settings={s}
            />
          </section>

          <Separator />

          {/* General */}
          <section className="grid gap-4">
            <h2 className="font-medium text-sm">Allgemein</h2>
            <SettingInput
              envFallbacks={fallbackMap}
              field="appBaseUrl"
              label="App Base URL"
              settings={s}
            />
          </section>

          <Button disabled={pending} size="lg" type="submit">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
