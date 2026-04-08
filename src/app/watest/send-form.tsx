"use client";

import { useActionState } from "react";
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
import {
  sendGowaQrAction,
  sendGowaTextAction,
  sendWhatsappQrAction,
  sendWhatsappTemplateAction,
  sendWhatsappTextAction,
  type WatestActionState,
} from "./action";

type TextAction = typeof sendGowaTextAction;
type QrAction = typeof sendGowaQrAction;
type TemplateAction = typeof sendWhatsappTemplateAction;

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

function TextForm({
  action,
  idPrefix,
  placeholder,
}: {
  action: TextAction;
  idPrefix: string;
  placeholder: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="grid gap-4">
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-to`}>Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id={`${idPrefix}-to`}
          name="to"
          placeholder={placeholder}
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-body`}>Nachricht</Label>
        <Textarea
          aria-invalid={!!state.errors?.body}
          id={`${idPrefix}-body`}
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

function QrForm({
  action,
  idPrefix,
  placeholder,
}: {
  action: QrAction;
  idPrefix: string;
  placeholder: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="grid gap-4">
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-to`}>Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id={`${idPrefix}-to`}
          name="to"
          placeholder={placeholder}
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-content`}>QR-Code Inhalt</Label>
        <Input
          aria-invalid={!!state.errors?.content}
          id={`${idPrefix}-content`}
          name="content"
          placeholder="https://example.com"
          required
        />
        <FieldError errors={state.errors?.content} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-caption`}>
          Bildunterschrift (optional)
        </Label>
        <Input id={`${idPrefix}-caption`} name="caption" />
      </div>
      <Button disabled={pending} size="lg" type="submit">
        {pending ? "Wird gesendet…" : "QR-Code senden"}
      </Button>
    </form>
  );
}

function TemplateForm({
  action,
  idPrefix,
}: {
  action: TemplateAction;
  idPrefix: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="grid gap-4">
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-to`}>Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id={`${idPrefix}-to`}
          name="to"
          placeholder="491701234567"
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Template-Name</Label>
        <Input
          aria-invalid={!!state.errors?.templateName}
          defaultValue="hello_world"
          id={`${idPrefix}-name`}
          name="templateName"
          required
        />
        <FieldError errors={state.errors?.templateName} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-lang`}>Sprach-Code</Label>
        <Input
          defaultValue="en_US"
          id={`${idPrefix}-lang`}
          name="languageCode"
          required
        />
      </div>
      <Button disabled={pending} size="lg" type="submit">
        {pending ? "Wird gesendet…" : "Template senden"}
      </Button>
    </form>
  );
}

function GowaPanel() {
  return (
    <Tabs defaultValue="text">
      <TabsList className="mb-4 w-full">
        <TabsTrigger value="text">Textnachricht</TabsTrigger>
        <TabsTrigger value="qr">QR-Code</TabsTrigger>
      </TabsList>
      <TabsContent value="text">
        <TextForm
          action={sendGowaTextAction}
          idPrefix="gowa-text"
          placeholder="+491701234567"
        />
      </TabsContent>
      <TabsContent value="qr">
        <QrForm
          action={sendGowaQrAction}
          idPrefix="gowa-qr"
          placeholder="+491701234567"
        />
      </TabsContent>
    </Tabs>
  );
}

function WhatsappPanel() {
  return (
    <Tabs defaultValue="template">
      <TabsList className="mb-4 w-full">
        <TabsTrigger value="template">Template</TabsTrigger>
        <TabsTrigger value="text">Text</TabsTrigger>
        <TabsTrigger value="qr">Text + QR</TabsTrigger>
      </TabsList>
      <TabsContent value="template">
        <TemplateForm action={sendWhatsappTemplateAction} idPrefix="wa-tpl" />
      </TabsContent>
      <TabsContent value="text">
        <TextForm
          action={sendWhatsappTextAction}
          idPrefix="wa-text"
          placeholder="491701234567"
        />
      </TabsContent>
      <TabsContent value="qr">
        <QrForm
          action={sendWhatsappQrAction}
          idPrefix="wa-qr"
          placeholder="491701234567"
        />
      </TabsContent>
    </Tabs>
  );
}

export function SendForm() {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Messaging Test</CardTitle>
        <CardDescription>
          Nachrichten via GoWA oder WhatsApp Business API versenden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gowa">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="gowa">GoWA</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp Business API</TabsTrigger>
          </TabsList>
          <TabsContent value="gowa">
            <GowaPanel />
          </TabsContent>
          <TabsContent value="whatsapp">
            <WhatsappPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
