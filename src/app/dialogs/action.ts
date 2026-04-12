"use server";

import { revalidatePath } from "next/cache";
import {
  createDialog,
  deleteDialog,
  getDialogById,
  setActiveDialog,
} from "@/domain/dialog/dialog-repository";
import { dialogDefinitionSchema } from "@/domain/dialog/dialog-schema";
import { seedDefaultDialog } from "@/domain/dialog/seed-default-dialog";

export interface DialogActionState {
  dialogId?: number;
  error?: string;
  success: boolean;
}

export async function createDialogAction(
  _prev: DialogActionState,
  formData: FormData
): Promise<DialogActionState> {
  await Promise.resolve();
  try {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!(name && slug)) {
      return { success: false, error: "Name und Slug sind erforderlich." };
    }

    const dialogId = createDialog({
      name,
      slug,
      definition: {
        version: 1,
        triggerKeywords: ["start"],
        timeoutMinutes: 60,
        unmatchedInputMode: "error",
        errorMessage: "Bitte wähle eine der angebotenen Optionen.",
        steps: [
          {
            id: "welcome",
            type: "text",
            message: "Willkommen!",
            transitions: [],
          },
        ],
      },
    });

    revalidatePath("/dialogs");
    return { success: true, dialogId };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteDialogAction(id: number): Promise<void> {
  await Promise.resolve();
  deleteDialog(id);
  revalidatePath("/dialogs");
}

export async function setActiveDialogAction(id: number): Promise<void> {
  await Promise.resolve();
  setActiveDialog(id);
  revalidatePath("/dialogs");
}

export async function importDialogAction(
  _prev: DialogActionState,
  formData: FormData
): Promise<DialogActionState> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "Keine Datei ausgewählt." };
    }

    const text = await file.text();
    const json: unknown = JSON.parse(text);
    const definition = dialogDefinitionSchema.parse(json);

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!(name && slug)) {
      return { success: false, error: "Name und Slug sind erforderlich." };
    }

    const dialogId = createDialog({
      name,
      slug,
      definition,
    });

    revalidatePath("/dialogs");
    return { success: true, dialogId };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function loadDefaultDialogAction(): Promise<void> {
  await Promise.resolve();
  seedDefaultDialog();
  revalidatePath("/dialogs");
}

export async function exportDialogAction(id: number): Promise<string> {
  await Promise.resolve();
  const dialog = getDialogById(id);
  if (!dialog) {
    throw new Error("Dialog nicht gefunden.");
  }
  return JSON.stringify(dialog.definition, null, 2);
}
