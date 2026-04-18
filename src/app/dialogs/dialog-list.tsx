"use client";

import { Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  deactivateDialogAction,
  deleteDialogAction,
  duplicateDialogAction,
  loadDefaultDialogAction,
  setActiveDialogAction,
  setDialogLockedAction,
} from "./action";

interface DialogListItem {
  createdAt: Date;
  description: string | null;
  id: number;
  isActive: number;
  isLocked: number;
  name: string;
  slug: string;
  version: number;
}

export function DialogList({ dialogs }: { dialogs: DialogListItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

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
              onClick={() => run(loadDefaultDialogAction)}
              size="sm"
              variant="secondary"
            >
              Default laden
            </Button>
            <Button
              onClick={() => run(createNewDialogAction)}
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
            {dialogs.map((dialog) => {
              const isActive = dialog.isActive === 1;
              const isLocked = dialog.isLocked === 1;
              return (
                <div
                  className="flex items-center justify-between rounded-md border p-3"
                  key={dialog.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{dialog.name}</span>
                      {isActive && <Badge variant="default">Aktiv</Badge>}
                      {isLocked && (
                        <Badge variant="secondary">
                          <Lock className="mr-1 size-3" />
                          Gesperrt
                        </Badge>
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
                        {isLocked ? "Ansehen" : "Bearbeiten"}
                      </Button>
                    </Link>
                    <Link href={`/dialogs/${dialog.id}/sessions`}>
                      <Button size="sm" variant="ghost">
                        Sessions
                      </Button>
                    </Link>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        run(() => duplicateDialogAction(dialog.id))
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Duplizieren
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        run(() => setDialogLockedAction(dialog.id, !isLocked))
                      }
                      size="sm"
                      variant="ghost"
                    >
                      {isLocked ? (
                        <>
                          <Unlock className="mr-1 size-3.5" />
                          Entsperren
                        </>
                      ) : (
                        <>
                          <Lock className="mr-1 size-3.5" />
                          Sperren
                        </>
                      )}
                    </Button>
                    <Separator className="mx-1 h-4" orientation="vertical" />
                    {isActive ? (
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          run(() => deactivateDialogAction(dialog.id))
                        }
                        size="sm"
                        variant="outline"
                      >
                        Deaktivieren
                      </Button>
                    ) : (
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          run(() => setActiveDialogAction(dialog.id))
                        }
                        size="sm"
                        variant="outline"
                      >
                        Aktivieren
                      </Button>
                    )}
                    {!(isActive || isLocked) && (
                      <Button
                        disabled={isPending}
                        onClick={() => run(() => deleteDialogAction(dialog.id))}
                        size="sm"
                        variant="destructive"
                      >
                        Löschen
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
