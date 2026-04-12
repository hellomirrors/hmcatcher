"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DialogStep } from "@/domain/dialog/dialog-schema";
import { TYPE_COLORS, TYPE_LABELS } from "@/domain/dialog/step-type-display";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import { WhatsappPreview } from "../whatsapp-preview";

interface NodeDetailPanelProps {
  onClose: () => void;
  open: boolean;
  step: DialogStep | null;
}

export function NodeDetailPanel({ open, onClose, step }: NodeDetailPanelProps) {
  const focusStepsStep = useDialogEditorStore((s) => s.focusStepsStep);

  if (!step) {
    return null;
  }

  const handleGoToStep = () => {
    focusStepsStep(step.id);
    onClose();
  };

  return (
    <Dialog onOpenChange={(v) => !v && onClose()} open={open}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{step.id}</span>
            <span
              className={`rounded px-1.5 py-0.5 font-medium text-[0.65rem] ${TYPE_COLORS[step.type]}`}
            >
              {TYPE_LABELS[step.type]}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="preview">WhatsApp Vorschau</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid gap-3 text-sm">
              {step.phase && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase</span>
                  <Badge variant="outline">{step.phase}</Badge>
                </div>
              )}
              {step.variableName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variable</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {step.variableName}
                  </code>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transitions</span>
                <span>{step.transitions.length}</span>
              </div>
              {step.options && step.options.length > 0 && (
                <div>
                  <span className="text-muted-foreground">
                    Optionen ({step.options.length})
                  </span>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {step.options.map((o) => (
                      <li key={o.id}>
                        {o.label}
                        {o.score != null && (
                          <span className="ml-1 text-muted-foreground">
                            +{o.score}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <WhatsappPreview step={step} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleGoToStep} size="sm" variant="outline">
            <ExternalLink className="mr-1.5 size-3.5" />
            Im Schritte-Tab anzeigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
