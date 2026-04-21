"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { deleteLeadAction } from "./action";

interface DeleteLeadButtonProps {
  leadId: number;
  leadName: string;
}

export function DeleteLeadButton({ leadId, leadName }: DeleteLeadButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteLeadAction(leadId);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="destructive">
            <Trash2 className="mr-2 size-4" />
            Löschen
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lead wirklich löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {leadName} sowie die komplette Dialog-Session inklusive aller
            Antworten werden unwiderruflich entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleConfirm}
            variant="destructive"
          >
            {pending ? "Lösche…" : "Endgültig löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
