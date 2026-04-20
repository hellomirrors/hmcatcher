"use client";

import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { ChatArea } from "./chat-area";
import { ChatInput } from "./chat-input";
import { SessionPanel } from "./session-panel";
import { useSimulatorStore } from "./simulator-store";
import { useSimulatorMqtt } from "./use-simulator-mqtt";

interface DialogSimulatorProps {
  definition: DialogDefinition;
}

export function DialogSimulator({ definition }: DialogSimulatorProps) {
  const status = useSimulatorStore((s) => s.status);
  const start = useSimulatorStore((s) => s.start);
  const reset = useSimulatorStore((s) => s.reset);

  useSimulatorMqtt(definition);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-md border bg-card p-3">
        <div className="text-muted-foreground text-sm">
          {status === "idle" && "Bereit zum Testen"}
          {status === "running" && "Simulation läuft"}
          {status === "completed" && "Simulation abgeschlossen"}
        </div>
        <div className="flex gap-2">
          {status === "idle" ? (
            <Button onClick={() => start(definition)} size="sm">
              <Play className="mr-2 size-4" />
              Simulation starten
            </Button>
          ) : (
            <Button onClick={reset} size="sm" variant="outline">
              <RotateCcw className="mr-2 size-4" />
              Neu starten
            </Button>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)] gap-4">
        {/* Chat area — left. min-h-0 prevents flex-1 from growing
           beyond the container, so ScrollArea scrolls internally. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[#ECE5DD]">
          <ChatArea definition={definition} />
          {status !== "idle" && <ChatInput definition={definition} />}
        </div>

        {/* Session panel — right */}
        <div className="w-72 shrink-0">
          <SessionPanel scoreBuckets={definition.scoreBuckets} />
        </div>
      </div>
    </div>
  );
}
