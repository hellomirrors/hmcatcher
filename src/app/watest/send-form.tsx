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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { sendQrAction, sendTextAction, type WatestActionState } from "./action";

const initial: WatestActionState = { success: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }
  return <p className="text-destructive text-xs">{errors[0]}</p>;
}

function ResultBanner({ state }: { state: WatestActionState }) {
  if (state.success) {
    return (
      <p className="rounded-md bg-primary/10 p-2 text-primary text-xs">
        Gesendet! Message ID: {state.messageId}
      </p>
    );
  }
  if (state.errors?._form) {
    return (
      <p className="rounded-md bg-destructive/10 p-2 text-destructive text-xs">
        {state.errors._form[0]}
      </p>
    );
  }
  return null;
}

function TextForm({ provider }: { provider: string }) {
  const [state, formAction, pending] = useActionState(sendTextAction, initial);
  const placeholder =
    provider === "telegram" ? "Chat-ID (z.B. 123456789)" : "+491701234567";

  return (
    <form action={formAction} className="grid gap-4">
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor="text-to">Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id="text-to"
          name="to"
          placeholder={placeholder}
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="text-body">Nachricht</Label>
        <Textarea
          aria-invalid={!!state.errors?.body}
          id="text-body"
          name="body"
          required
        />
        <FieldError errors={state.errors?.body} />
      </div>
      <Button disabled={pending} size="lg" type="submit">
        {pending ? "Wird gesendet…" : "Text senden"}
      </Button>
    </form>
  );
}

function QrForm({ provider }: { provider: string }) {
  const [state, formAction, pending] = useActionState(sendQrAction, initial);
  const placeholder =
    provider === "telegram" ? "Chat-ID (z.B. 123456789)" : "+491701234567";

  return (
    <form action={formAction} className="grid gap-4">
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor="qr-to">Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id="qr-to"
          name="to"
          placeholder={placeholder}
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="qr-content">QR-Code Inhalt</Label>
        <Input
          aria-invalid={!!state.errors?.content}
          id="qr-content"
          name="content"
          placeholder="https://example.com"
          required
        />
        <FieldError errors={state.errors?.content} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="qr-caption">Bildunterschrift (optional)</Label>
        <Input id="qr-caption" name="caption" />
      </div>
      <Button disabled={pending} size="lg" type="submit">
        {pending ? "Wird gesendet…" : "QR-Code senden"}
      </Button>
    </form>
  );
}

export function SendForm({ provider }: { provider: string }) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Messaging Test
          <Badge variant="outline">{provider}</Badge>
        </CardTitle>
        <CardDescription>
          Testnachrichten und QR-Codes versenden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="text">Textnachricht</TabsTrigger>
            <TabsTrigger value="qr">QR-Code</TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <TextForm provider={provider} />
          </TabsContent>
          <TabsContent value="qr">
            <QrForm provider={provider} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
