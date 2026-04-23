/**
 * Static form schema for the slotmachine /slotmachine page.
 * Mirrors the qualification questions from `default-dialog.json` but lives
 * here as plain data so the web form is decoupled from whatever dialog is
 * currently active on the WA side. Scores per option determine the lead
 * bucket; branching after `arbeitsbereich` picks which follow-up questions
 * appear.
 */

import type { DialogValidationType } from "@/domain/dialog/dialog-schema";

export interface SlotFormOption {
  id: string;
  label: string;
  score?: number;
}

export interface AnswerState {
  label?: string;
  score: number;
  value: string;
}

export type StepKind = "free_text" | "select" | "radio";

export interface StaticFormStep {
  autoComplete?: string;
  id: string;
  inputMode?: "text" | "email" | "tel";
  kind: StepKind;
  label: string;
  message?: string;
  options?: SlotFormOption[];
  validation?: DialogValidationType;
  validationMessage?: string;
}

// ---------------------------------------------------------------------------
// Options — copied verbatim from default-dialog.json so scoring stays aligned
// ---------------------------------------------------------------------------

export const ARBEITSBEREICH_OPTIONS: SlotFormOption[] = [
  { id: "ab-stationaer", label: "Stationäre Pflege", score: 30 },
  { id: "ab-ambulant", label: "Ambulante Pflege", score: 0 },
  { id: "ab-bildung", label: "Bildungseinrichtung", score: 0 },
  { id: "ab-medizinisch", label: "Medizinisch", score: 0 },
  { id: "ab-sonstiges", label: "Sonstiges", score: 0 },
];

const ROLLE_STATIONAER: SlotFormOption[] = [
  { id: "rs-el", label: "Einrichtungsleitung", score: 60 },
  { id: "rs-stel", label: "Stellv. Leitung", score: 60 },
  { id: "rs-pdl", label: "PDL", score: 60 },
  { id: "rs-lsb", label: "Soziale Betreuung", score: 60 },
  { id: "rs-qm", label: "Qualitätsmanagement", score: 10 },
  { id: "rs-wbl", label: "Wohnbereichsleitung", score: 10 },
  { id: "rs-vl", label: "Verwaltungsleitung", score: 10 },
  { id: "rs-43b", label: "Betreuungskraft", score: 10 },
  { id: "rs-111", label: "Geschäftsführung", score: 60 },
  { id: "rs-azubi", label: "Azubi", score: 10 },
];

const ROLLE_AMBULANT: SlotFormOption[] = [
  { id: "ra-gf", label: "Geschäftsführung", score: 50 },
  { id: "ra-pdl", label: "PDL", score: 40 },
  { id: "ra-spdl", label: "Stellv. PDL", score: 35 },
  { id: "ra-qm", label: "Qualitätsmanagement", score: 30 },
  { id: "ra-tl", label: "Teamleitung", score: 25 },
  { id: "ra-bk", label: "Betreuungskraft", score: 10 },
  { id: "ra-verw", label: "Verwaltung / Büro", score: 15 },
];

const ROLLE_BILDUNG: SlotFormOption[] = [
  { id: "rb-sl", label: "Schulleitung", score: 40 },
  { id: "rb-doz", label: "Dozent / Lehrkraft", score: 25 },
  { id: "rb-pa", label: "Praxisanleitung", score: 30 },
  { id: "rb-pp", label: "Pflegepädagoge", score: 25 },
  { id: "rb-kl", label: "Kursleitung", score: 20 },
  { id: "rb-verw", label: "Verwaltung", score: 15 },
  { id: "rb-stud", label: "Student / Azubi", score: 5 },
];

const ROLLE_MEDIZINISCH: SlotFormOption[] = [
  { id: "rm-kl", label: "Klinikleitung", score: 50 },
  { id: "rm-al", label: "Ärztliche Leitung", score: 40 },
  { id: "rm-pdl", label: "Pflegedienstleitung", score: 40 },
  { id: "rm-stl", label: "Stationsleitung", score: 30 },
  { id: "rm-thl", label: "Therapie-Leitung", score: 25 },
  { id: "rm-sd", label: "Sozialdienst", score: 20 },
  { id: "rm-fk", label: "Fachkraft", score: 10 },
  { id: "rm-verw", label: "Verwaltung", score: 15 },
];

const EINRICHTUNGSTYP_BILDUNG: SlotFormOption[] = [
  { id: "tb-ps", label: "Pflegeschule", score: 20 },
  { id: "tb-bfs", label: "Berufsfachschule", score: 15 },
  { id: "tb-hs", label: "Hochschule / Uni", score: 10 },
  { id: "tb-fwb", label: "Weiterbildung", score: 15 },
  { id: "tb-vhs", label: "VHS / Erwachsene", score: 5 },
  { id: "tb-sonst", label: "Sonstige", score: 5 },
];

const EINRICHTUNGSTYP_MEDIZINISCH: SlotFormOption[] = [
  { id: "tm-kh", label: "Krankenhaus / Klinik", score: 20 },
  { id: "tm-reha", label: "Rehaklinik", score: 15 },
  { id: "tm-ger", label: "Geriatrische Klinik", score: 20 },
  { id: "tm-tk", label: "Tagesklinik", score: 10 },
  { id: "tm-mvz", label: "MVZ", score: 10 },
  { id: "tm-hos", label: "Hospiz / Palliativ", score: 15 },
  { id: "tm-sonst", label: "Sonstige", score: 5 },
];

const TYP_SONSTIGES: SlotFormOption[] = [
  { id: "so-aus", label: "Aussteller", score: 10 },
  { id: "so-ber", label: "Berater / Consultant", score: 15 },
  { id: "so-ver", label: "Verband", score: 10 },
  { id: "so-pol", label: "Politik / Behörde", score: 5 },
  { id: "so-wiss", label: "Wissenschaft", score: 10 },
  { id: "so-press", label: "Presse / Medien", score: 15 },
  { id: "so-inv", label: "Investor / Partner", score: 30 },
  { id: "so-stud", label: "Student / Azubi", score: 5 },
  { id: "so-priv", label: "Privat", score: 5 },
];

const BETTEN_STATIONAER: SlotFormOption[] = [
  { id: "bs-u20", label: "Unter 20", score: 10 },
  { id: "bs-20-60", label: "20 bis 60 Betten", score: 20 },
  { id: "bs-60-80", label: "60 bis 80 Betten", score: 30 },
  { id: "bs-ue80", label: "Über 80 Betten", score: 30 },
];

const TRAEGERSCHAFT: SlotFormOption[] = [
  { id: "ts-priv", label: "Privat", score: 15 },
  { id: "ts-oeff", label: "Öffentlich", score: 10 },
  { id: "ts-frei", label: "Freigemeinnützig", score: 10 },
];

const ALREADY_CUSTOMER_OPTIONS: SlotFormOption[] = [
  { id: "ac-ja", label: "Ja", score: -30 },
  { id: "ac-nein", label: "Nein", score: 0 },
];

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export const STEP_VORNAME: StaticFormStep = {
  id: "vorname",
  kind: "free_text",
  label: "Wie heißt du mit Vornamen?",
  validation: "nonempty",
  validationMessage: "Bitte gib deinen Vornamen ein.",
  autoComplete: "given-name",
};

export const STEP_NACHNAME: StaticFormStep = {
  id: "nachname",
  kind: "free_text",
  label: "Und dein Nachname?",
  validation: "nonempty",
  validationMessage: "Bitte gib deinen Nachnamen ein.",
  autoComplete: "family-name",
};

export const STEP_EMAIL: StaticFormStep = {
  id: "email",
  kind: "free_text",
  label: "Wie lautet deine E-Mail-Adresse?",
  validation: "email",
  validationMessage: "Bitte gib eine gültige E-Mail-Adresse ein.",
  autoComplete: "email",
  inputMode: "email",
};

export const STEP_ALREADY_CUSTOMER: StaticFormStep = {
  id: "alreadyCustomer",
  kind: "radio",
  label: "Bist du bereits Kunde bei Hello Mirrors?",
  options: ALREADY_CUSTOMER_OPTIONS,
};

export const STEP_ARBEITSBEREICH: StaticFormStep = {
  id: "arbeitsbereich",
  kind: "select",
  label: "In welchem Bereich arbeitest du?",
  options: ARBEITSBEREICH_OPTIONS,
};

export const STEP_ROLLE_STATIONAER: StaticFormStep = {
  id: "rolle",
  kind: "select",
  label: "Welche Rolle hast du in deiner Einrichtung?",
  options: ROLLE_STATIONAER,
};

export const STEP_ROLLE_AMBULANT: StaticFormStep = {
  id: "rolle",
  kind: "select",
  label: "Welche Rolle hast du in deinem Pflegedienst?",
  options: ROLLE_AMBULANT,
};

export const STEP_ROLLE_BILDUNG: StaticFormStep = {
  id: "rolle",
  kind: "select",
  label: "Welche Rolle hast du an deiner Bildungseinrichtung?",
  options: ROLLE_BILDUNG,
};

export const STEP_ROLLE_MEDIZINISCH: StaticFormStep = {
  id: "rolle",
  kind: "select",
  label: "Welche Rolle hast du in deiner Einrichtung?",
  options: ROLLE_MEDIZINISCH,
};

export const STEP_EINRICHTUNGSTYP_BILDUNG: StaticFormStep = {
  id: "einrichtungstyp",
  kind: "select",
  label: "Was für eine Einrichtung ist das?",
  options: EINRICHTUNGSTYP_BILDUNG,
};

export const STEP_EINRICHTUNGSTYP_MEDIZINISCH: StaticFormStep = {
  id: "einrichtungstyp",
  kind: "select",
  label: "Was für eine Einrichtung ist das?",
  options: EINRICHTUNGSTYP_MEDIZINISCH,
};

export const STEP_EINRICHTUNG: StaticFormStep = {
  id: "einrichtung",
  kind: "free_text",
  label: "Wie heißt deine Einrichtung?",
  validation: "nonempty",
  validationMessage: "Bitte gib den Namen deiner Einrichtung ein.",
};

export const STEP_NAME_AMBULANT: StaticFormStep = {
  id: "einrichtung",
  kind: "free_text",
  label: "Wie heißt euer Pflegedienst?",
  validation: "nonempty",
  validationMessage: "Bitte gib den Namen eures Pflegedienstes ein.",
};

export const STEP_BETTEN: StaticFormStep = {
  id: "betten",
  kind: "select",
  label: "Wie viele Betten hat die Einrichtung?",
  options: BETTEN_STATIONAER,
};

export const STEP_TRAEGERSCHAFT: StaticFormStep = {
  id: "traegerschaft",
  kind: "radio",
  label: "Ist eure Einrichtung in privater oder öffentlicher Trägerschaft?",
  options: TRAEGERSCHAFT,
};

export const STEP_PLZ: StaticFormStep = {
  id: "plz",
  kind: "free_text",
  label: "Was ist die Postleitzahl deiner Einrichtung?",
  validation: "plz",
  validationMessage: "Bitte gib eine gültige Postleitzahl ein.",
  autoComplete: "postal-code",
  inputMode: "text",
};

export const STEP_TYP_SONSTIGES: StaticFormStep = {
  id: "typ",
  kind: "select",
  label: "Was beschreibt dich am besten?",
  options: TYP_SONSTIGES,
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * Walks the branching form flow based on the currently-committed answers.
 * Returns the ordered list of visible step objects. The caller renders each
 * in order and reveals the next once a step is committed.
 */
export function buildFlow(
  answers: Record<string, AnswerState>
): StaticFormStep[] {
  const flow: StaticFormStep[] = [
    STEP_VORNAME,
    STEP_NACHNAME,
    STEP_EMAIL,
    STEP_ALREADY_CUSTOMER,
    STEP_ARBEITSBEREICH,
  ];

  const branch = answers.arbeitsbereich?.value;
  if (!branch) {
    return flow;
  }

  switch (branch) {
    case "ab-stationaer":
      flow.push(
        STEP_ROLLE_STATIONAER,
        STEP_EINRICHTUNG,
        STEP_BETTEN,
        STEP_TRAEGERSCHAFT,
        STEP_PLZ
      );
      break;
    case "ab-ambulant":
      flow.push(STEP_ROLLE_AMBULANT, STEP_NAME_AMBULANT, STEP_PLZ);
      break;
    case "ab-bildung":
      flow.push(
        STEP_ROLLE_BILDUNG,
        STEP_EINRICHTUNGSTYP_BILDUNG,
        STEP_EINRICHTUNG
      );
      break;
    case "ab-medizinisch":
      flow.push(
        STEP_ROLLE_MEDIZINISCH,
        STEP_EINRICHTUNGSTYP_MEDIZINISCH,
        STEP_EINRICHTUNG
      );
      break;
    case "ab-sonstiges":
      flow.push(STEP_TYP_SONSTIGES);
      break;
    default:
      break;
  }
  return flow;
}

export function computeVisibleSteps(answers: Record<string, AnswerState>): {
  complete: boolean;
  steps: StaticFormStep[];
} {
  const flow = buildFlow(answers);
  const visible: StaticFormStep[] = [];
  for (const step of flow) {
    visible.push(step);
    const answer = answers[step.id];
    if (!answer) {
      return { steps: visible, complete: false };
    }
  }
  return { steps: visible, complete: true };
}

export function computeTotalScore(
  answers: Record<string, AnswerState>
): number {
  return Object.values(answers).reduce((sum, a) => sum + a.score, 0);
}

export function computeVariables(
  answers: Record<string, AnswerState>
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    vars[key] = value.value;
    if (value.label) {
      vars[`${key}_label`] = value.label;
    }
  }
  return vars;
}
