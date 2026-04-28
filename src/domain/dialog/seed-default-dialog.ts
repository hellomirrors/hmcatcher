import { createLogger } from "@/lib/logger";
import defaultDialogJson from "./default-dialog.json" with { type: "json" };
import {
  createDialog,
  listDialogs,
  setActiveDialog,
  updateDialog,
} from "./dialog-repository";
import { dialogDefinitionSchema } from "./dialog-schema";
import formDialogJson from "./form-dialog.json" with { type: "json" };
import formDialogStuttgartJson from "./form-dialog-stuttgart-2026.json" with {
  type: "json",
};

const log = createLogger("dialog-seed");

const DIALOG_SLUG = "altenpflege-essen-2026";
const DIALOG_NAME = "Felix Gewinnspiel — Altenpflege Essen 2026";
const DIALOG_DESCRIPTION =
  "Interaktives Gewinnspiel für den Hello Mirrors Stand auf der Altenpflege Messe Essen 2026";

const FORM_DIALOG_SLUG = "form-dialog";
const FORM_DIALOG_NAME = "Felix Jackpot — Web-Formular";
const FORM_DIALOG_DESCRIPTION =
  "Dialog-Variante für das /slotmachine Web-Formular";

const STUTTGART_DIALOG_SLUG = "pflege-plus-stuttgart-2026";
const STUTTGART_DIALOG_NAME = "PFLEGE PLUS Stuttgart 2026";
const STUTTGART_DIALOG_DESCRIPTION =
  "Felix Gewinnspiel — PFLEGE PLUS Stuttgart 2026";

const defaultDefinition = dialogDefinitionSchema.parse(defaultDialogJson);
const formDefinition = dialogDefinitionSchema.parse(formDialogJson);
const stuttgartDefinition = dialogDefinitionSchema.parse(
  formDialogStuttgartJson
);

/**
 * Seeds the default trade-fair dialog by slug if it does not yet exist.
 *
 * Insert-only: an existing dialog is never overwritten, so edits made via
 * the dialog editor UI (score weights, messages, transitions) survive
 * deploys and page reloads. Activation is only forced when NO dialog is
 * currently active — otherwise an admin-chosen active dialog (e.g. the
 * form-dialog variant) would get flipped back on every /dialogs visit.
 *
 * To force-load the bundled defaults over the stored definition, use
 * `resetDefaultDialog` (wired to the "Default laden" button).
 */
export const seedDefaultDialog = (): void => {
  const all = listDialogs();
  const existing = all.find((d) => d.slug === DIALOG_SLUG);
  const hasActive = all.some((d) => d.isActive === 1);

  if (existing) {
    if (!hasActive) {
      setActiveDialog(existing.id);
    }
    return;
  }

  log.info("No default dialog found, seeding...");
  const id = createDialog({
    name: DIALOG_NAME,
    slug: DIALOG_SLUG,
    description: DIALOG_DESCRIPTION,
    definition: defaultDefinition,
  });
  if (!hasActive) {
    setActiveDialog(id);
  }
  log.info("Default dialog seeded", { dialogId: id });
};

/**
 * Force-overwrites the stored default dialog with the bundled defaults
 * from default-dialog.json. Creates the dialog if it does not exist.
 * Intended for explicit user action via the "Default laden" button.
 */
export const resetDefaultDialog = (): void => {
  const existing = listDialogs().find((d) => d.slug === DIALOG_SLUG);

  if (existing) {
    log.info("Resetting default dialog to bundled seed", {
      dialogId: existing.id,
      slug: DIALOG_SLUG,
    });
    updateDialog(existing.id, {
      name: DIALOG_NAME,
      description: DIALOG_DESCRIPTION,
      definition: defaultDefinition,
    });
    if (!existing.isActive) {
      setActiveDialog(existing.id);
    }
    return;
  }

  log.info("No default dialog found, seeding...");
  const id = createDialog({
    name: DIALOG_NAME,
    slug: DIALOG_SLUG,
    description: DIALOG_DESCRIPTION,
    definition: defaultDefinition,
  });
  setActiveDialog(id);
};

/**
 * Loads or reloads the bundled form-dialog.json under its own slug. Unlike
 * the default loader, this does NOT auto-activate the dialog — the admin
 * activates it from the list when they want to switch the /slotmachine
 * form over to this definition.
 */
export const resetFormDialog = (): number => {
  const existing = listDialogs().find((d) => d.slug === FORM_DIALOG_SLUG);
  if (existing) {
    log.info("Resetting form dialog to bundled seed", {
      dialogId: existing.id,
    });
    updateDialog(existing.id, {
      name: FORM_DIALOG_NAME,
      description: FORM_DIALOG_DESCRIPTION,
      definition: formDefinition,
    });
    return existing.id;
  }
  log.info("Seeding form dialog");
  return createDialog({
    name: FORM_DIALOG_NAME,
    slug: FORM_DIALOG_SLUG,
    description: FORM_DIALOG_DESCRIPTION,
    definition: formDefinition,
  });
};

/**
 * Loads or reloads the bundled form-dialog-stuttgart-2026.json under its
 * own slug. Mirrors `resetFormDialog` — does NOT auto-activate.
 */
export const resetStuttgartDialog = (): number => {
  const existing = listDialogs().find((d) => d.slug === STUTTGART_DIALOG_SLUG);
  if (existing) {
    log.info("Resetting Stuttgart 2026 dialog to bundled seed", {
      dialogId: existing.id,
    });
    updateDialog(existing.id, {
      name: STUTTGART_DIALOG_NAME,
      description: STUTTGART_DIALOG_DESCRIPTION,
      definition: stuttgartDefinition,
    });
    return existing.id;
  }
  log.info("Seeding Stuttgart 2026 dialog");
  return createDialog({
    name: STUTTGART_DIALOG_NAME,
    slug: STUTTGART_DIALOG_SLUG,
    description: STUTTGART_DIALOG_DESCRIPTION,
    definition: stuttgartDefinition,
  });
};
