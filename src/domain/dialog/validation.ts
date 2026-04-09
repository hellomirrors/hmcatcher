import type { DialogValidationType } from "./dialog-schema";

const PLZ_RE = /^\d{5}$/;
const PHONE_RE = /^\+?\d{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAnswer(
  value: string,
  validation: DialogValidationType
): boolean {
  const trimmed = value.trim();
  switch (validation) {
    case "nonempty":
      return trimmed.length > 0;
    case "email":
      return EMAIL_RE.test(trimmed);
    case "phone":
      return PHONE_RE.test(trimmed.replace(/[\s\-()]/g, ""));
    case "plz":
      return PLZ_RE.test(trimmed);
    case "number":
      return trimmed.length > 0 && !Number.isNaN(Number(trimmed));
    default:
      return true;
  }
}
