"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { deleteSessionAction } from "./action";

interface Answer {
  answerLabel: string | null;
  answerValue: string;
  createdAt: Date;
  id: number;
  scoreAdded: number;
  sessionId: number;
  stepId: string;
}

interface Session {
  answers: Answer[];
  contact: string;
  createdAt: Date;
  currentStepId: string;
  dialogId: number;
  id: number;
  provider: string;
  reminderSentAt: Date | null;
  score: number;
  state: string;
  updatedAt: Date;
  variables: Record<string, string>;
}

interface SessionTableProps {
  dialogId: number;
  dialogName: string;
  sessions: Session[];
}

const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);

const stateBadgeVariant = (
  state: string
): "default" | "destructive" | "outline" | "secondary" => {
  switch (state) {
    case "active":
      return "default";
    case "completed":
      return "secondary";
    default:
      return "outline";
  }
};

const stateLabel = (state: string): string => {
  switch (state) {
    case "active":
      return "Aktiv";
    case "completed":
      return "Abgeschlossen";
    case "expired":
      return "Abgelaufen";
    default:
      return state;
  }
};

export const SessionTable = ({
  dialogId,
  dialogName,
  sessions,
}: SessionTableProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (sessionId: number) => {
    await deleteSessionAction(sessionId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sessions &mdash; {dialogName}</CardTitle>
          <Link href={`/dialogs/${dialogId}`}>
            <Button size="sm" variant="outline">
              Zurück zum Dialog
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch keine Sessions vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isExpanded = expandedId === session.id;
              const variableEntries = Object.entries(session.variables);

              return (
                <div className="rounded-md border p-4" key={session.id}>
                  <button
                    className="flex w-full cursor-pointer flex-wrap items-center gap-3 text-left"
                    onClick={() => toggle(session.id)}
                    type="button"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{session.provider}</Badge>
                        <span className="font-medium">{session.contact}</span>
                        <Badge variant={stateBadgeVariant(session.state)}>
                          {stateLabel(session.state)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                        <span>Schritt: {session.currentStepId}</span>
                        <span>Punkte: {session.score}</span>
                        <span>Gestartet: {formatTime(session.createdAt)}</span>
                        <span>
                          Letzte Aktivitaet: {formatTime(session.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4">
                      {variableEntries.length > 0 && (
                        <div>
                          <h4 className="mb-1 font-medium text-sm">
                            Variablen
                          </h4>
                          <div className="rounded bg-muted p-2 text-xs">
                            {variableEntries.map(([key, value]) => (
                              <div className="flex gap-2" key={key}>
                                <span className="font-mono text-muted-foreground">
                                  {key}:
                                </span>
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {session.answers.length > 0 && (
                        <div>
                          <h4 className="mb-1 font-medium text-sm">
                            Antworten
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground text-xs">
                                  <th className="pr-3 pb-1">Schritt</th>
                                  <th className="pr-3 pb-1">Wert</th>
                                  <th className="pr-3 pb-1">Label</th>
                                  <th className="pr-3 pb-1">Punkte</th>
                                  <th className="pb-1">Zeitpunkt</th>
                                </tr>
                              </thead>
                              <tbody>
                                {session.answers.map((answer) => (
                                  <tr
                                    className="border-b last:border-0"
                                    key={answer.id}
                                  >
                                    <td className="py-1 pr-3 font-mono text-xs">
                                      {answer.stepId}
                                    </td>
                                    <td className="py-1 pr-3">
                                      {answer.answerValue}
                                    </td>
                                    <td className="py-1 pr-3 text-muted-foreground">
                                      {answer.answerLabel ?? "\u2014"}
                                    </td>
                                    <td className="py-1 pr-3">
                                      {answer.scoreAdded > 0
                                        ? `+${answer.scoreAdded}`
                                        : answer.scoreAdded}
                                    </td>
                                    <td className="py-1 text-muted-foreground text-xs">
                                      {formatTime(answer.createdAt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {session.answers.length === 0 && (
                        <p className="text-muted-foreground text-xs">
                          Keine Antworten vorhanden.
                        </p>
                      )}

                      <Separator />

                      <div className="flex justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger>
                            Session löschen
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Session loeschen?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Die Session und alle zugehoerigen Antworten
                                werden unwiderruflich geloescht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(session.id)}
                              >
                                Loeschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
