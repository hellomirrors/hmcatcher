"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { sendTestMessage, type TestResult } from "./action";
import type { ProviderStatus } from "./provider-status";

export function StatusDashboard({
  providers,
}: {
  providers: ProviderStatus[];
}) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <CardDescription>
          Verbindungsstatus und Nachrichtentest für alle Messenger.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {providers.map((provider, i) => (
          <div key={provider.id}>
            {i > 0 && <Separator className="mb-6" />}
            <ProviderCard provider={provider} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProviderCard({ provider }: { provider: ProviderStatus }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function handleTest() {
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestMessage(provider.id, phoneNumber);
      setResult(res);
    } catch {
      setResult({
        provider: provider.id,
        success: false,
        error: "Unerwarteter Fehler",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{provider.label}</h3>
        <Badge variant={provider.configured ? "default" : "destructive"}>
          {provider.configured ? "Konfiguriert" : "Nicht konfiguriert"}
        </Badge>
      </div>

      {provider.missingVars.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="mb-1 font-medium text-destructive text-xs">
            Fehlende Umgebungsvariablen:
          </p>
          {provider.missingVars.map((v) => (
            <code className="mr-2 text-xs" key={v}>
              {v}
            </code>
          ))}
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={`phone-${provider.id}`}>Telefonnummer</Label>
        <div className="flex gap-2">
          <Input
            id={`phone-${provider.id}`}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={
              provider.id === "telegram" ? "Chat-ID" : "491701234567"
            }
            type="text"
            value={phoneNumber}
          />
          <Button
            disabled={!provider.configured || sending || !phoneNumber.trim()}
            onClick={handleTest}
            variant="outline"
          >
            {sending ? "Sendet…" : "Testen"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {provider.id === "telegram"
            ? "Numerische Chat-ID des Empfängers."
            : "Nummer im internationalen Format ohne + (z.B. 491701234567)."}
        </p>
      </div>

      {result && (
        <div
          className={`rounded-md p-2 text-xs ${
            result.success
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {result.success
            ? `Nachricht gesendet (ID: ${result.messageId})`
            : `Fehler: ${result.error}`}
        </div>
      )}
    </div>
  );
}
