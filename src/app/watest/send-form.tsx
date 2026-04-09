"use client";

import { useActionState, useCallback, useId, useState } from "react";
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
  sendWhatsappButtonsAction,
  sendWhatsappListAction,
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

interface ButtonEntry {
  key: string;
  title: string;
}

function ButtonsForm() {
  const id = useId();
  const [state, formAction, pending] = useActionState(
    sendWhatsappButtonsAction,
    initial
  );
  const [buttons, setButtons] = useState<ButtonEntry[]>([
    { key: crypto.randomUUID(), title: "" },
  ]);

  const addButton = useCallback(() => {
    if (buttons.length >= 3) {
      return;
    }
    setButtons((prev) => [...prev, { key: crypto.randomUUID(), title: "" }]);
  }, [buttons.length]);

  const removeButton = useCallback((key: string) => {
    setButtons((prev) => prev.filter((b) => b.key !== key));
  }, []);

  const updateButton = useCallback((key: string, title: string) => {
    setButtons((prev) =>
      prev.map((b) => (b.key === key ? { ...b, title } : b))
    );
  }, []);

  return (
    <form
      action={(formData) => {
        const serialized = buttons
          .filter((b) => b.title.trim())
          .map((b, i) => ({ id: `btn_${i}`, title: b.title.trim() }));
        formData.set("buttons", JSON.stringify(serialized));
        formAction(formData);
      }}
      className="grid gap-4"
    >
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-to`}>Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id={`${id}-to`}
          name="to"
          placeholder="491701234567"
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-header`}>Header (optional)</Label>
        <Input id={`${id}-header`} name="headerText" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-body`}>Nachrichtentext</Label>
        <Textarea
          aria-invalid={!!state.errors?.bodyText}
          id={`${id}-body`}
          name="bodyText"
          required
        />
        <FieldError errors={state.errors?.bodyText} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-footer`}>Footer (optional)</Label>
        <Input id={`${id}-footer`} name="footerText" />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Buttons (max. 3)</Label>
          {buttons.length < 3 && (
            <Button
              onClick={addButton}
              size="sm"
              type="button"
              variant="outline"
            >
              + Button
            </Button>
          )}
        </div>
        <FieldError errors={state.errors?.buttons} />
        {buttons.map((btn) => (
          <div className="flex gap-2" key={btn.key}>
            <Input
              className="flex-1"
              maxLength={20}
              onChange={(e) => updateButton(btn.key, e.target.value)}
              placeholder="Button-Titel (max. 20 Zeichen)"
              required
              value={btn.title}
            />
            {buttons.length > 1 && (
              <Button
                className="shrink-0"
                onClick={() => removeButton(btn.key)}
                size="icon"
                type="button"
                variant="ghost"
              >
                x
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button disabled={pending} size="lg" type="submit">
        {pending ? "Wird gesendet…" : "Buttons senden"}
      </Button>
    </form>
  );
}

interface RowEntry {
  description: string;
  key: string;
  title: string;
}

function ListForm() {
  const id = useId();
  const [state, formAction, pending] = useActionState(
    sendWhatsappListAction,
    initial
  );
  const [rows, setRows] = useState<RowEntry[]>([
    { key: crypto.randomUUID(), title: "", description: "" },
  ]);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { key: crypto.randomUUID(), title: "", description: "" },
    ]);
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }, []);

  const updateRow = useCallback(
    (key: string, field: "title" | "description", value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  return (
    <form
      action={(formData) => {
        const serialized = rows
          .filter((r) => r.title.trim())
          .map((r, i) => ({
            id: `row_${i}`,
            title: r.title.trim(),
            description: r.description.trim() || undefined,
          }));
        formData.set("rows", JSON.stringify(serialized));
        formAction(formData);
      }}
      className="grid gap-4"
    >
      <ResultBanner state={state} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-to`}>Empfänger</Label>
        <Input
          aria-invalid={!!state.errors?.to}
          id={`${id}-to`}
          name="to"
          placeholder="491701234567"
          required
        />
        <FieldError errors={state.errors?.to} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-header`}>Header (optional)</Label>
        <Input id={`${id}-header`} name="headerText" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-body`}>Nachrichtentext</Label>
        <Textarea
          aria-invalid={!!state.errors?.bodyText}
          id={`${id}-body`}
          name="bodyText"
          required
        />
        <FieldError errors={state.errors?.bodyText} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-footer`}>Footer (optional)</Label>
        <Input id={`${id}-footer`} name="footerText" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-button`}>Button-Text</Label>
        <Input
          aria-invalid={!!state.errors?.buttonText}
          defaultValue="Optionen anzeigen"
          id={`${id}-button`}
          name="buttonText"
          required
        />
        <FieldError errors={state.errors?.buttonText} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-section`}>Abschnittsname (optional)</Label>
        <Input
          defaultValue="Optionen"
          id={`${id}-section`}
          name="sectionTitle"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Zeilen</Label>
          <Button onClick={addRow} size="sm" type="button" variant="outline">
            + Zeile
          </Button>
        </div>
        <FieldError errors={state.errors?.rows} />
        {rows.map((row) => (
          <div className="flex gap-2" key={row.key}>
            <Input
              className="flex-1"
              onChange={(e) => updateRow(row.key, "title", e.target.value)}
              placeholder="Titel"
              required
              value={row.title}
            />
            <Input
              className="flex-1"
              onChange={(e) =>
                updateRow(row.key, "description", e.target.value)
              }
              placeholder="Beschreibung (opt.)"
              value={row.description}
            />
            {rows.length > 1 && (
              <Button
                className="shrink-0"
                onClick={() => removeRow(row.key)}
                size="icon"
                type="button"
                variant="ghost"
              >
                x
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button disabled={pending} size="lg" type="submit">
        {pending ? "Wird gesendet…" : "Liste senden"}
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
        <TabsTrigger value="buttons">Buttons</TabsTrigger>
        <TabsTrigger value="list">Liste</TabsTrigger>
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
      <TabsContent value="buttons">
        <ButtonsForm />
      </TabsContent>
      <TabsContent value="list">
        <ListForm />
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
