"use client";

import { RotateCcw, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ScoreBucket } from "@/domain/dialog/dialog-schema";
import { bucketColorClass, resolveBucket } from "@/domain/dialog/score-buckets";
import { useSimulatorStore } from "./simulator-store";

interface SessionPanelProps {
  scoreBuckets?: ScoreBucket[];
}

export function SessionPanel({ scoreBuckets }: SessionPanelProps) {
  const session = useSimulatorStore((s) => s.session);
  const status = useSimulatorStore((s) => s.status);
  const snapshots = useSimulatorStore((s) => s.snapshots);
  const stepBack = useSimulatorStore((s) => s.stepBack);
  const reset = useSimulatorStore((s) => s.reset);

  let statusLabel = "Bereit";
  if (status === "running") {
    statusLabel = "Läuft";
  } else if (status === "completed") {
    statusLabel = "Abgeschlossen";
  }

  let statusVariant: "default" | "secondary" | "outline" = "outline";
  if (status === "running") {
    statusVariant = "default";
  } else if (status === "completed") {
    statusVariant = "secondary";
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          Session
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={snapshots.length === 0}
            onClick={stepBack}
            size="sm"
            variant="outline"
          >
            <Undo2 className="mr-1.5 size-3.5" />
            Zurück
          </Button>
          <Button
            className="flex-1"
            disabled={status === "idle"}
            onClick={reset}
            size="sm"
            variant="outline"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
        </div>

        {session && (
          <>
            <Separator />

            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schritt</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {session.currentStepId}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Score</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{session.score}</span>
                  {(() => {
                    const bucket = resolveBucket(session.score, scoreBuckets);
                    if (!bucket) {
                      return null;
                    }
                    return (
                      <span
                        className={`rounded px-1.5 py-0.5 font-medium text-[0.6rem] ${bucketColorClass(bucket.id)}`}
                      >
                        {bucket.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {Object.keys(session.variables).length > 0 && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <span className="font-medium text-muted-foreground text-xs">
                    Variablen
                  </span>
                  {Object.entries(session.variables)
                    .filter(([k]) => !k.startsWith("_"))
                    .map(([key, value]) => (
                      <div
                        className="flex items-start justify-between gap-2"
                        key={key}
                      >
                        <code className="shrink-0 text-xs">{key}</code>
                        <span className="truncate text-right text-muted-foreground text-xs">
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
