import type { DialogValidationType } from "@/domain/dialog/dialog-schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLZ_RE = /^\d{5}$/;
const PHONE_RE = /^\+?\d{7,15}$/;
const NUMBER_RE = /^-?\d+$/;
const GERMAN_MOBILE_RE = /^\+49[1-9]\d{6,13}$/;

export function runValidation(
  value: string,
  kind: DialogValidationType | undefined
): boolean {
  if (!kind) {
    return true;
  }
  const trimmed = value.trim();
  switch (kind) {
    case "nonempty":
      return trimmed.length > 0;
    case "email":
      return EMAIL_RE.test(trimmed);
    case "plz":
      return PLZ_RE.test(trimmed);
    case "number":
      return NUMBER_RE.test(trimmed);
    case "phone":
      return PHONE_RE.test(trimmed.replace(/[\s\-()]/g, ""));
    default:
      return true;
  }
}

/**
 * Normalises common German mobile input formats to E.164. `+49` is enforced;
 * local formats (`0170…`) get rewritten, `0049` and double-zero prefixes are
 * converted to `+`. Anything else is returned as-is so the validator can
 * reject it.
 */
export function normalizeGermanMobile(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (!cleaned) {
    return "";
  }
  if (cleaned.startsWith("+49")) {
    return cleaned;
  }
  if (cleaned.startsWith("0049")) {
    return `+${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("00")) {
    return `+${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("0")) {
    return `+49${cleaned.slice(1)}`;
  }
  return cleaned;
}

export function isValidGermanMobile(value: string): boolean {
  return GERMAN_MOBILE_RE.test(normalizeGermanMobile(value));
}
