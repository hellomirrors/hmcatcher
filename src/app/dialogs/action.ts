"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createDialog,
  deactivateDialog,
  deleteDialog,
  getDialogById,
  listDialogs,
  setActiveDialog,
  setDialogLocked,
} from "@/domain/dialog/dialog-repository";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { dialogDefinitionSchema } from "@/domain/dialog/dialog-schema";
import {
  resetDefaultDialog,
  resetFormDialog,
  resetStuttgartDialog,
} from "@/domain/dialog/seed-default-dialog";

const BLANK_DEFINITION: DialogDefinition = {
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
};

const COUNTED_SUFFIX = /^(.*?)\s*\((\d+)\)\s*$/;
const SLUG_REPLACE = /[^a-z0-9]+/g;
const SLUG_TRIM = /^-+|-+$/g;
const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

function slugify(input: string): string {
  const lower = input.toLowerCase();
  const transliterated = lower.replace(/[äöüß]/g, (c) => UMLAUT_MAP[c] ?? c);
  return transliterated.replace(SLUG_REPLACE, "-").replace(SLUG_TRIM, "");
}

function findUniqueNameAndSlug(baseName: string): {
  name: string;
  slug: string;
} {
  const match = COUNTED_SUFFIX.exec(baseName);
  const stripped = match ? match[1].trim() : baseName.trim();

  const existing = listDialogs();
  const existingNames = new Set(existing.map((d) => d.name));
  const existingSlugs = new Set(existing.map((d) => d.slug));

  let name = stripped;
  if (existingNames.has(name)) {
    let n = 2;
    while (existingNames.has(`${stripped} (${n})`)) {
      n++;
    }
    name = `${stripped} (${n})`;
  }

  const baseSlug = slugify(name) || "dialog";
  let slug = baseSlug;
  let m = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${m}`;
    m++;
  }

  return { name, slug };
}

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

export async function createNewDialogAction(): Promise<void> {
  await Promise.resolve();
  const { name, slug } = findUniqueNameAndSlug("Neuer Dialog");
  const id = createDialog({
    name,
    slug,
    definition: BLANK_DEFINITION,
  });
  revalidatePath("/dialogs");
  redirect(`/dialogs/${id}`);
}

export async function duplicateDialogAction(sourceId: number): Promise<void> {
  await Promise.resolve();
  const source = getDialogById(sourceId);
  if (!source) {
    throw new Error("Dialog nicht gefunden.");
  }
  const { name, slug } = findUniqueNameAndSlug(source.name);
  const id = createDialog({
    name,
    slug,
    description: source.description ?? undefined,
    definition: source.definition,
  });
  revalidatePath("/dialogs");
  redirect(`/dialogs/${id}`);
}

export async function deleteDialogAction(id: number): Promise<void> {
  await Promise.resolve();
  const dialog = getDialogById(id);
  if (dialog?.isLocked === 1) {
    throw new Error("Dialog ist gesperrt.");
  }
  deleteDialog(id);
  revalidatePath("/dialogs");
}

export async function setActiveDialogAction(id: number): Promise<void> {
  await Promise.resolve();
  setActiveDialog(id);
  revalidatePath("/dialogs");
}

export async function deactivateDialogAction(id: number): Promise<void> {
  await Promise.resolve();
  deactivateDialog(id);
  revalidatePath("/dialogs");
}

export async function setDialogLockedAction(
  id: number,
  locked: boolean
): Promise<void> {
  await Promise.resolve();
  setDialogLocked(id, locked);
  revalidatePath("/dialogs");
  revalidatePath(`/dialogs/${id}`);
}

// ---------------------------------------------------------------------------
// FormData-accepting actions — wired directly to <form action=…> so Next.js
// handles the page refresh itself. Plain client wrappers don't trigger that
// lifecycle, which is why the buttons previously appeared to do nothing.
// ---------------------------------------------------------------------------

function formIdFrom(formData: FormData): number {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) {
    throw new Error("Ungültige Dialog-ID.");
  }
  return id;
}

export async function activateDialogFormAction(
  formData: FormData
): Promise<void> {
  await Promise.resolve();
  setActiveDialog(formIdFrom(formData));
  revalidatePath("/dialogs");
}

export async function deactivateDialogFormAction(
  formData: FormData
): Promise<void> {
  await Promise.resolve();
  deactivateDialog(formIdFrom(formData));
  revalidatePath("/dialogs");
}

export async function duplicateDialogFormAction(
  formData: FormData
): Promise<void> {
  await duplicateDialogAction(formIdFrom(formData));
}

export async function deleteDialogFormAction(
  formData: FormData
): Promise<void> {
  await deleteDialogAction(formIdFrom(formData));
}

export async function toggleDialogLockFormAction(
  formData: FormData
): Promise<void> {
  await Promise.resolve();
  const id = formIdFrom(formData);
  const isLocked = formData.get("locked") === "1";
  setDialogLocked(id, !isLocked);
  revalidatePath("/dialogs");
  revalidatePath(`/dialogs/${id}`);
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
  resetDefaultDialog();
  revalidatePath("/dialogs");
}

export async function loadFormDialogAction(): Promise<void> {
  await Promise.resolve();
  resetFormDialog();
  revalidatePath("/dialogs");
}

export async function loadStuttgartDialogAction(): Promise<void> {
  await Promise.resolve();
  resetStuttgartDialog();
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
