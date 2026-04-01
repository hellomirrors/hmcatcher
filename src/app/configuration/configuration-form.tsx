"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  ConversationConfig,
  Role,
} from "@/domain/configuration/configuration-schema";
import { exportConfigurationAction, saveConfigurationAction } from "./action";
import { StarRating } from "./star-rating";

interface MessageField {
  key: keyof ConversationConfig["messages"];
  label: string;
}

const MESSAGE_FIELDS: MessageField[] = [
  { key: "welcome", label: "Willkommensnachricht" },
  { key: "ask_first_name", label: "Frage: Vorname" },
  { key: "ask_last_name", label: "Frage: Nachname" },
  { key: "ask_position", label: "Frage: Position" },
  { key: "ask_email", label: "Frage: E-Mail" },
  { key: "ask_consent", label: "Frage: Einwilligung" },
  { key: "complete", label: "Abschlussnachricht" },
  { key: "empty_first_name", label: "Fehler: Vorname leer" },
  { key: "empty_last_name", label: "Fehler: Nachname leer" },
  { key: "invalid_email", label: "Fehler: Ungültige E-Mail" },
  { key: "consent_declined", label: "Einwilligung abgelehnt" },
  { key: "type_position", label: "Aufforderung: Position eintippen" },
  { key: "invalid_consent", label: "Fehler: Ungültige Consent-Antwort" },
];

interface UiField {
  key: keyof ConversationConfig["ui"];
  label: string;
}

const UI_FIELDS: UiField[] = [
  { key: "position_list_title", label: "Positionsliste: Titel" },
  { key: "position_list_body", label: "Positionsliste: Beschreibung" },
  { key: "position_list_button", label: "Positionsliste: Button-Text" },
  { key: "consent_yes_label", label: "Ja-Button" },
  { key: "consent_no_label", label: "Nein-Button" },
  {
    key: "qr_caption_template",
    label: "QR-Code Bildunterschrift ({firstName} = Platzhalter)",
  },
];

export function ConfigurationForm({ config }: { config: ConversationConfig }) {
  const [messages, setMessages] = useState(config.messages);
  const [ui, setUi] = useState(config.ui);
  const [roles, setRoles] = useState<Role[]>(config.roles);
  const [keywords, setKeywords] = useState(config.customPositionKeywords);

  const buildConfig = useCallback(
    (): ConversationConfig => ({
      messages,
      ui,
      roles,
      customPositionKeywords: keywords,
    }),
    [messages, ui, roles, keywords]
  );

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; success: boolean },
      _formData: FormData
    ) => {
      const configJson = JSON.stringify(buildConfig());
      const fd = new FormData();
      fd.set("config", configJson);
      return await saveConfigurationAction(_prev, fd);
    },
    { success: false }
  );

  const handleExport = async () => {
    const json = await exportConfigurationAction();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conversation-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateMessage = (
    key: keyof ConversationConfig["messages"],
    value: string
  ) => {
    setMessages((prev) => ({ ...prev, [key]: value }));
  };

  const updateUi = (key: keyof ConversationConfig["ui"], value: string) => {
    setUi((prev) => ({ ...prev, [key]: value }));
  };

  const updateRole = (index: number, update: Partial<Role>) => {
    setRoles((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...update } : r))
    );
  };

  const removeRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const addRole = () => {
    setRoles((prev) => [
      ...prev,
      { id: `pos_${Date.now()}`, title: "", stars: 3 },
    ]);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <form action={formAction}>
        {state.success && (
          <p className="mb-4 rounded-md bg-primary/10 p-2 text-primary text-xs">
            Konfiguration gespeichert.
          </p>
        )}
        {state.error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-2 text-destructive text-xs">
            {state.error}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nachrichten</CardTitle>
            <CardDescription>
              Texte die im Konversations-Dialog angezeigt werden.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {MESSAGE_FIELDS.map((field) => (
              <div className="grid gap-1.5" key={field.key}>
                <Label htmlFor={`msg-${field.key}`}>{field.label}</Label>
                <Textarea
                  id={`msg-${field.key}`}
                  onChange={(e) => updateMessage(field.key, e.target.value)}
                  rows={field.key === "welcome" ? 4 : 2}
                  value={messages[field.key]}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI Labels</CardTitle>
            <CardDescription>
              Beschriftungen für Buttons und Listen.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {UI_FIELDS.map((field) => (
              <div className="grid gap-1.5" key={field.key}>
                <Label htmlFor={`ui-${field.key}`}>{field.label}</Label>
                <Input
                  id={`ui-${field.key}`}
                  onChange={(e) => updateUi(field.key, e.target.value)}
                  value={ui[field.key]}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rollen / Positionen</CardTitle>
            <CardDescription>
              Vordefinierte Rollen mit Relevanz-Bewertung (Sterne).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {roles.map((role, index) => (
              <div
                className="flex items-center gap-2 rounded-md border p-2"
                key={role.id}
              >
                <Input
                  className="flex-1"
                  onChange={(e) => updateRole(index, { title: e.target.value })}
                  placeholder="Rollenname"
                  value={role.title}
                />
                <StarRating
                  onChange={(stars) => updateRole(index, { stars })}
                  value={role.stars}
                />
                <Button
                  onClick={() => removeRole(index)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <Button onClick={addRole} size="sm" type="button" variant="outline">
              Rolle hinzufügen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Freitext-Positionen</CardTitle>
            <CardDescription>
              Relevanz-Regeln für frei eingegebene Positionen.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>
                Keywords für hohe Relevanz
                <Badge className="ml-2" variant="outline">
                  Enthält eines dieser Wörter → hohe Relevanz
                </Badge>
              </Label>
              <div className="flex flex-wrap gap-2">
                {keywords.highRelevance.map((kw, i) => (
                  <div className="flex items-center gap-1" key={kw}>
                    <Input
                      className="w-28"
                      onChange={(e) => {
                        const updated = [...keywords.highRelevance];
                        updated[i] = e.target.value;
                        setKeywords((prev) => ({
                          ...prev,
                          highRelevance: updated,
                        }));
                      }}
                      value={kw}
                    />
                    <Button
                      onClick={() => {
                        setKeywords((prev) => ({
                          ...prev,
                          highRelevance: prev.highRelevance.filter(
                            (_, j) => j !== i
                          ),
                        }));
                      }}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-2.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() =>
                    setKeywords((prev) => ({
                      ...prev,
                      highRelevance: [...prev.highRelevance, ""],
                    }))
                  }
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  +
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Sterne bei Keyword-Treffer</Label>
                <StarRating
                  onChange={(stars) =>
                    setKeywords((prev) => ({
                      ...prev,
                      highRelevanceStars: stars,
                    }))
                  }
                  value={keywords.highRelevanceStars}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Sterne ohne Treffer</Label>
                <StarRating
                  onChange={(stars) =>
                    setKeywords((prev) => ({ ...prev, defaultStars: stars }))
                  }
                  value={keywords.defaultStars}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex gap-2">
          <Button disabled={pending} size="lg" type="submit">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
          <Button
            onClick={handleExport}
            size="lg"
            type="button"
            variant="outline"
          >
            JSON exportieren
          </Button>
        </div>
      </form>
    </div>
  );
}
