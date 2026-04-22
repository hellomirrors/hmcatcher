"use client";

import { Lock, Unlock } from "lucide-react";
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
  activateDialogFormAction,
  createNewDialogAction,
  deactivateDialogFormAction,
  deleteDialogFormAction,
  duplicateDialogFormAction,
  loadDefaultDialogAction,
  loadFormDialogAction,
  toggleDialogLockFormAction,
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
            <form action={loadDefaultDialogAction}>
              <Button size="sm" type="submit" variant="secondary">
                Default laden
              </Button>
            </form>
            <form action={loadFormDialogAction}>
              <Button size="sm" type="submit" variant="secondary">
                Form-Dialog laden
              </Button>
            </form>
            <form action={createNewDialogAction}>
              <Button size="sm" type="submit" variant="outline">
                Neuer Dialog
              </Button>
            </form>
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
                    <form action={duplicateDialogFormAction}>
                      <input name="id" type="hidden" value={dialog.id} />
                      <Button size="sm" type="submit" variant="ghost">
                        Duplizieren
                      </Button>
                    </form>
                    <form action={toggleDialogLockFormAction}>
                      <input name="id" type="hidden" value={dialog.id} />
                      <input
                        name="locked"
                        type="hidden"
                        value={isLocked ? "1" : "0"}
                      />
                      <Button size="sm" type="submit" variant="ghost">
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
                    </form>
                    <Separator className="mx-1 h-4" orientation="vertical" />
                    {isActive ? (
                      <form action={deactivateDialogFormAction}>
                        <input name="id" type="hidden" value={dialog.id} />
                        <Button size="sm" type="submit" variant="outline">
                          Deaktivieren
                        </Button>
                      </form>
                    ) : (
                      <form action={activateDialogFormAction}>
                        <input name="id" type="hidden" value={dialog.id} />
                        <Button size="sm" type="submit" variant="outline">
                          Aktivieren
                        </Button>
                      </form>
                    )}
                    {!(isActive || isLocked) && (
                      <form action={deleteDialogFormAction}>
                        <input name="id" type="hidden" value={dialog.id} />
                        <Button size="sm" type="submit" variant="destructive">
                          Löschen
                        </Button>
                      </form>
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
