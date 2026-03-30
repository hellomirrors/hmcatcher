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
import { Textarea } from "@/components/ui/textarea";
import { type ContactFormState, submitContactData } from "./action";

const initialState: ContactFormState = { success: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }
  return <p className="text-destructive text-xs">{errors[0]}</p>;
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactData,
    initialState
  );

  if (state.success) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Vielen Dank!</CardTitle>
          <CardDescription>
            Ihre Kontaktdaten wurden erfolgreich übermittelt.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Kontaktdaten</CardTitle>
        <CardDescription>Bitte füllen Sie das Formular aus.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid gap-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" type="tel" />
            <FieldError errors={state.errors?.phone} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="message">Nachricht</Label>
            <Textarea id="message" name="message" />
            <FieldError errors={state.errors?.message} />
          </div>

          <Button disabled={pending} size="lg" type="submit">
            {pending ? "Wird gesendet…" : "Absenden"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
