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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/domain/configuration/configuration-schema";
import { type ContactFormState, submitContactForm } from "./action";

const initialState: ContactFormState = { success: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }
  return <p className="text-destructive text-xs">{errors[0]}</p>;
}

export function ContactForm({
  provider,
  userId,
  roles,
  chatReturnUrl,
}: {
  chatReturnUrl: string;
  provider: string;
  roles: Role[];
  userId: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState
  );

  if (state.success) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 text-center">
        <h2 className="font-semibold text-xl">Vielen Dank!</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Dein persönlicher QR-Code wurde in den Chat gesendet.
        </p>
        {chatReturnUrl && (
          <a
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary font-medium text-primary-foreground text-sm hover:bg-primary/90"
            href={chatReturnUrl}
          >
            Zurück zum Chat
          </a>
        )}
      </div>
    );
  }

  const selectableRoles = roles.filter((r) => r.id !== "pos_other");

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Kontaktdaten</CardTitle>
        <CardDescription>
          Fülle das Formular aus, um deinen QR-Code zu erhalten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <input name="provider" type="hidden" value={provider} />
          <input name="userId" type="hidden" value={userId} />

          {state.error && (
            <p className="rounded-md bg-destructive/10 p-2 text-destructive text-xs">
              {state.error}
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="firstName">Vorname</Label>
            <Input
              aria-invalid={!!state.errors?.firstName}
              id="firstName"
              name="firstName"
              required
            />
            <FieldError errors={state.errors?.firstName} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lastName">Nachname</Label>
            <Input
              aria-invalid={!!state.errors?.lastName}
              id="lastName"
              name="lastName"
              required
            />
            <FieldError errors={state.errors?.lastName} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="position">Position</Label>
            <Select name="position">
              <SelectTrigger id="position">
                <SelectValue placeholder="Position wählen" />
              </SelectTrigger>
              <SelectContent>
                {selectableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.title}>
                    {role.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={state.errors?.position} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              aria-invalid={!!state.errors?.email}
              id="email"
              name="email"
              required
              type="email"
            />
            <FieldError errors={state.errors?.email} />
          </div>

          <p className="text-muted-foreground text-xs">
            Mit dem Absenden stimmst du der Speicherung deiner Daten und dem
            Versand deines QR-Codes zu.
          </p>

          <Button disabled={pending} size="lg" type="submit">
            {pending ? "Wird gesendet…" : "QR-Code anfordern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
