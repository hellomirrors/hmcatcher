"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  createNewDialogAction,
  deleteDialogAction,
  duplicateDialogAction,
  loadDefaultDialogAction,
  setActiveDialogAction,
} from "./action";

interface DialogListItem {
  createdAt: Date;
  description: string | null;
  id: number;
  isActive: number;
  name: string;
  slug: string;
  version: number;
}

export function DialogList({ dialogs }: { dialogs: DialogListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dialoge</CardTitle>
            <CardDescription>
              Konfigurierbare Konversations-Flows verwalten.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadDefaultDialogAction()}
              size="sm"
              variant="secondary"
            >
              Default laden
            </Button>
            <Button
              onClick={() => createNewDialogAction()}
              size="sm"
              variant="outline"
            >
              Neuer Dialog
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dialogs.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            Keine Dialoge vorhanden.
          </p>
        ) : (
          <div className="grid gap-3">
            {dialogs.map((dialog) => (
              <div
                className="flex items-center justify-between rounded-md border p-3"
                key={dialog.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{dialog.name}</span>
                    {dialog.isActive === 1 && (
                      <Badge variant="default">Aktiv</Badge>
                    )}
                    <Badge variant="outline">v{dialog.version}</Badge>
                  </div>
                  <div className="mt-0.5 text-muted-foreground text-xs">
                    {dialog.slug}
                    {dialog.description && ` — ${dialog.description}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/dialogs/${dialog.id}`}>
                    <Button size="sm" variant="ghost">
                      Bearbeiten
                    </Button>
                  </Link>
                  <Link href={`/dialogs/${dialog.id}/sessions`}>
                    <Button size="sm" variant="ghost">
                      Sessions
                    </Button>
                  </Link>
                  <Button
                    onClick={() => duplicateDialogAction(dialog.id)}
                    size="sm"
                    variant="ghost"
                  >
                    Duplizieren
                  </Button>
                  {dialog.isActive !== 1 && (
                    <>
                      <Button
                        onClick={() => setActiveDialogAction(dialog.id)}
                        size="sm"
                        variant="outline"
                      >
                        Aktivieren
                      </Button>
                      <Separator className="mx-1 h-4" orientation="vertical" />
                      <Button
                        onClick={() => deleteDialogAction(dialog.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Löschen
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
