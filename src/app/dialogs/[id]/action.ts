"use server";

import { revalidatePath } from "next/cache";
import { getDialogById, updateDialog } from "@/domain/dialog/dialog-repository";
import { dialogDefinitionSchema } from "@/domain/dialog/dialog-schema";

interface SaveDialogResult {
  error?: string;
  success: boolean;
}

interface SaveDialogInput {
  definitionJson: string;
  description: string;
  name: string;
}

export const saveDialogAction = async (
  id: number,
  input: SaveDialogInput
): Promise<SaveDialogResult> => {
  try {
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "Name darf nicht leer sein." };
    }
    const existing = getDialogById(id);
    if (existing?.isLocked === 1) {
      return { success: false, error: "Dialog ist gesperrt (readonly)." };
    }
    const parsed: unknown = JSON.parse(input.definitionJson);
    const definition = dialogDefinitionSchema.parse(parsed);
    updateDialog(id, {
      name,
      description: input.description,
      definition,
    });
    await revalidatePath(`/dialogs/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};
