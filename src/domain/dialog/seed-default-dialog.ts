import { createLogger } from "@/lib/logger";
import defaultDialogJson from "./default-dialog.json" with { type: "json" };
import {
  createDialog,
  listDialogs,
  setActiveDialog,
  updateDialog,
} from "./dialog-repository";
import { dialogDefinitionSchema } from "./dialog-schema";

const log = createLogger("dialog-seed");

const DIALOG_SLUG = "altenpflege-essen-2026";
const DIALOG_NAME = "Felix Gewinnspiel — Altenpflege Essen 2026";
const DIALOG_DESCRIPTION =
  "Interaktives Gewinnspiel für den Hello Mirrors Stand auf der Altenpflege Messe Essen 2026";

const defaultDefinition = dialogDefinitionSchema.parse(defaultDialogJson);

/**
 * Seeds the default trade-fair dialog by slug if it does not yet exist.
 *
 * Insert-only: an existing dialog is never overwritten, so edits made via
 * the dialog editor UI (score weights, messages, transitions) survive
 * deploys and page reloads. The only reconciliation is to re-activate the
 * default dialog if it was deactivated.
 *
 * To force-load the bundled defaults over the stored definition, use
 * `resetDefaultDialog` (wired to the "Default laden" button).
 */
export const seedDefaultDialog = (): void => {
  const existing = listDialogs().find((d) => d.slug === DIALOG_SLUG);

  if (existing) {
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
  log.info("Default dialog seeded and activated", { dialogId: id });
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
