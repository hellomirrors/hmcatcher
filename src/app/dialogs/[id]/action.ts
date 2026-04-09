"use server";

import { revalidatePath } from "next/cache";
import { updateDialog } from "@/domain/dialog/dialog-repository";
import { dialogDefinitionSchema } from "@/domain/dialog/dialog-schema";

interface SaveDialogResult {
  error?: string;
  success: boolean;
}

export const saveDialogAction = async (
  id: number,
  definitionJson: string
): Promise<SaveDialogResult> => {
  try {
    const parsed: unknown = JSON.parse(definitionJson);
    const definition = dialogDefinitionSchema.parse(parsed);
    updateDialog(id, { definition });
    await revalidatePath(`/dialogs/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};
