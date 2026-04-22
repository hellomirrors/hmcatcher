import type { DialogStepType } from "./dialog-schema";

export const TYPE_COLORS: Record<DialogStepType, string> = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  buttons:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  list: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  free_text:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  qr: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  video: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  mqtt: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  document: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  timer: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
};

export const TYPE_LABELS: Record<DialogStepType, string> = {
  text: "Text",
  buttons: "Buttons",
  list: "Liste",
  free_text: "Freitext",
  qr: "QR",
  video: "Video",
  mqtt: "MQTT",
  document: "Dokument",
  timer: "Timer",
};

/** Node border/ring colors keyed by step type (Tailwind classes). */
export const TYPE_BORDER_COLORS: Record<DialogStepType, string> = {
  text: "border-blue-400",
  buttons: "border-purple-400",
  list: "border-amber-400",
  free_text: "border-green-400",
  qr: "border-rose-400",
  video: "border-cyan-400",
  mqtt: "border-orange-400",
  document: "border-slate-400",
  timer: "border-zinc-400",
};
