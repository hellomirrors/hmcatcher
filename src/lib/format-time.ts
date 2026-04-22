/**
 * Date formatting helpers that always render in the booth's local timezone
 * (Europe/Berlin) and include the short timezone name (e.g. MESZ/MEZ), so
 * timestamps are never ambiguous when Ops staff reads them from anywhere.
 */

const DATE_TIME_TZ = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
  timeZoneName: "short",
});

const DATE_TIME_SECONDS_TZ = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Berlin",
  timeZoneName: "short",
});

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) {
    return "—";
  }
  return DATE_TIME_TZ.format(date);
}

export function formatDateTimeWithSeconds(
  date: Date | null | undefined
): string {
  if (!date) {
    return "—";
  }
  return DATE_TIME_SECONDS_TZ.format(date);
}
