"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import type { TransitionEdgeData } from "./compute-layout";

interface EdgeDetailPanelProps {
  data: TransitionEdgeData | null;
  onClose: () => void;
  open: boolean;
  sourceId: string;
  targetId: string;
}

export function EdgeDetailPanel({
  open,
  onClose,
  sourceId,
  targetId,
  data,
}: EdgeDetailPanelProps) {
  const focusStepsStep = useDialogEditorStore((s) => s.focusStepsStep);

  const handleGoToSource = () => {
    focusStepsStep(sourceId);
    onClose();
  };

  return (
    <Dialog onOpenChange={(v) => !v && onClose()} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <code className="rounded bg-muted px-1.5 py-0.5">{sourceId}</code>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <code className="rounded bg-muted px-1.5 py-0.5">{targetId}</code>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 text-sm">
          {data?.conditions && data.conditions.length > 0 ? (
            <>
              <span className="font-medium">Bedingungen</span>
              <div className="grid gap-1">
                {data.conditions.map((c, i) => (
                  <div
                    className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
                    key={`${c.field}-${i}`}
                  >
                    <code>{c.field}</code>
                    <Badge className="text-[0.6rem]" variant="secondary">
                      {c.operator}
                    </Badge>
                    <code>{String(c.value)}</code>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Keine Bedingungen (Fallback)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleGoToSource} size="sm" variant="outline">
            <ExternalLink className="mr-1.5 size-3.5" />
            Quellschritt bearbeiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
