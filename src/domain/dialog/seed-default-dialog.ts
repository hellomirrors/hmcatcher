import { createLogger } from "@/lib/logger";
import {
  createDialog,
  listDialogs,
  setActiveDialog,
  updateDialog,
} from "./dialog-repository";
import type { DialogDefinition, DialogStep } from "./dialog-schema";

const log = createLogger("dialog-seed");

const DIALOG_SLUG = "altenpflege-essen-2026";
const DIALOG_NAME = "Felix Gewinnspiel — Altenpflege Essen 2026";
const DIALOG_DESCRIPTION =
  "Interaktives Gewinnspiel für den Hello Mirrors Stand auf der Altenpflege Messe Essen 2026";

const defaultDefinition: DialogDefinition = {
  version: 1,
  triggerKeywords: ["start", "hallo", "hi", "hello"],
  timeoutMinutes: 60,
  reminderAfterMinutes: 30,
  reminderMessage:
    "Hey! Du bist noch mittendrin im Gewinnspiel. Schreib einfach weiter, um teilzunehmen!",
  timeoutMessage:
    "Deine Gewinnspiel-Session ist leider abgelaufen. Schreib 'start' um neu zu beginnen!",
  unmatchedInputMode: "error",
  errorMessage: "Bitte wähle eine der angebotenen Optionen.",
  scoreBuckets: [
    { id: "low", label: "Low", minScore: 0 },
    { id: "medium", label: "Medium", minScore: 51 },
    { id: "high", label: "High", minScore: 101 },
  ],
  steps: [
    // ─── SHARED_START ───────────────────────────────────────────

    {
      id: "welcome",
      type: "buttons",
      phase: "Onboarding",
      message:
        "Willkommen beim Felix Gewinnspiel!\n\nWenn du mitmachen möchtest, bestätige mit 'Ja' und nimm automatisch an unserem Gewinnspiel teil.\n\nMit deiner Teilnahme akzeptierst du unsere Teilnahmebedingungen und Datenschutzhinweise:\nhellomirrors.com/essen",
      options: [{ id: "welcome-ja", label: "Ja, teilnehmen" }],
      transitions: [{ targetStepId: "vorname" }],
    },
    {
      id: "vorname",
      type: "free_text",
      phase: "Lead Erfassung",
      message: "Super, freut uns!\n\nWie heißt du mit Vornamen?",
      variableName: "vorname",
      validation: "nonempty",
      validationMessage: "Bitte gib deinen Vornamen ein.",
      transitions: [{ targetStepId: "nachname" }],
    },
    {
      id: "nachname",
      type: "free_text",
      phase: "Lead Erfassung",
      message: "Und dein Nachname?",
      variableName: "nachname",
      validation: "nonempty",
      validationMessage: "Bitte gib deinen Nachnamen ein.",
      transitions: [{ targetStepId: "arbeitsbereich" }],
    },
    {
      id: "arbeitsbereich",
      type: "list",
      phase: "Qualifizierung",
      message: "In welchem Bereich arbeitest du?",
      variableName: "arbeitsbereich",
      listButtonText: "Auswählen",
      options: [
        { id: "ab-stationaer", label: "Stationäre Pflege", score: 30 },
        { id: "ab-ambulant", label: "Ambulante Pflege", score: 20 },
        { id: "ab-bildung", label: "Bildungseinrichtung", score: 15 },
        { id: "ab-medizinisch", label: "Medizinisch", score: 20 },
        { id: "ab-sonstiges", label: "Sonstiges", score: 5 },
      ],
      transitions: [
        {
          conditions: [
            { field: "arbeitsbereich", operator: "eq", value: "ab-stationaer" },
          ],
          targetStepId: "rolle-stationaer",
        },
        {
          conditions: [
            { field: "arbeitsbereich", operator: "eq", value: "ab-ambulant" },
          ],
          targetStepId: "rolle-ambulant",
        },
        {
          conditions: [
            { field: "arbeitsbereich", operator: "eq", value: "ab-bildung" },
          ],
          targetStepId: "rolle-bildung",
        },
        {
          conditions: [
            {
              field: "arbeitsbereich",
              operator: "eq",
              value: "ab-medizinisch",
            },
          ],
          targetStepId: "rolle-medizinisch",
        },
        {
          conditions: [
            { field: "arbeitsbereich", operator: "eq", value: "ab-sonstiges" },
          ],
          targetStepId: "typ-sonstiges",
        },
      ],
    },

    // ─── FLOW_STATIONAER ────────────────────────────────────────

    {
      id: "rolle-stationaer",
      type: "list",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du in deiner Einrichtung?",
      variableName: "rolle",
      listButtonText: "Auswählen",
      options: [
        { id: "rs-el", label: "Einrichtungsleitung", score: 50 },
        { id: "rs-stel", label: "Stellv. Leitung", score: 50 },
        { id: "rs-pdl", label: "PDL", score: 50 },
        { id: "rs-lsb", label: "Soziale Betreuung", score: 50 },
        { id: "rs-qm", label: "Qualitätsmanagement", score: 50 },
        { id: "rs-wbl", label: "Wohnbereichsleitung", score: 30 },
        { id: "rs-vl", label: "Verwaltungsleitung", score: 30 },
        { id: "rs-pfk", label: "Pflegefachkraft", score: 10 },
        { id: "rs-phk", label: "Pflegehilfskraft", score: 10 },
        { id: "rs-43b", label: "Betreuungskraft §43b", score: 10 },
      ],
      transitions: [{ targetStepId: "einrichtung-stationaer" }],
    },
    {
      id: "einrichtung-stationaer",
      type: "free_text",
      phase: "Qualifizierung",
      message: "Wie heißt deine Einrichtung?",
      variableName: "einrichtung",
      validation: "nonempty",
      validationMessage: "Bitte gib den Namen deiner Einrichtung ein.",
      transitions: [{ targetStepId: "betten-stationaer" }],
    },
    {
      id: "betten-stationaer",
      type: "buttons",
      phase: "Qualifizierung",
      message: "Wie viele Betten hat die Einrichtung?",
      variableName: "betten",
      options: [
        { id: "bs-u40", label: "Unter 40 Betten", score: 20 },
        { id: "bs-40-80", label: "40 bis 80 Betten", score: 35 },
        { id: "bs-ue80", label: "Über 80 Betten", score: 50 },
      ],
      transitions: [{ targetStepId: "traegerschaft-stationaer" }],
    },
    {
      id: "traegerschaft-stationaer",
      type: "buttons",
      phase: "Qualifizierung",
      message:
        "Ist eure Einrichtung in privater oder öffentlicher Trägerschaft?",
      variableName: "traegerschaft",
      options: [
        { id: "ts-priv", label: "Privat", score: 15 },
        { id: "ts-oeff", label: "Öffentlich", score: 10 },
        { id: "ts-frei", label: "Freigemeinnützig", score: 10 },
      ],
      transitions: [{ targetStepId: "plz-stationaer" }],
    },
    {
      id: "plz-stationaer",
      type: "free_text",
      phase: "Qualifizierung",
      message: "Was ist die Postleitzahl deiner Einrichtung?",
      variableName: "plz",
      validation: "plz",
      validationMessage: "Bitte gib eine gültige Postleitzahl ein.",
      transitions: [{ targetStepId: "qr-code" }],
    },

    // ─── FLOW_AMBULANT ──────────────────────────────────────────

    {
      id: "rolle-ambulant",
      type: "list",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du in deinem Pflegedienst?",
      variableName: "rolle",
      listButtonText: "Auswählen",
      options: [
        { id: "ra-gf", label: "Geschäftsführung", score: 50 },
        { id: "ra-pdl", label: "PDL", score: 40 },
        { id: "ra-spdl", label: "Stellv. PDL", score: 35 },
        { id: "ra-qm", label: "Qualitätsmanagement", score: 30 },
        { id: "ra-tl", label: "Teamleitung", score: 25 },
        { id: "ra-pfk", label: "Pflegefachkraft", score: 10 },
        { id: "ra-bk", label: "Betreuungskraft", score: 10 },
        { id: "ra-verw", label: "Verwaltung / Büro", score: 15 },
      ],
      transitions: [{ targetStepId: "name-ambulant" }],
    },
    {
      id: "name-ambulant",
      type: "free_text",
      phase: "Qualifizierung",
      message: "Wie heißt euer Pflegedienst?",
      variableName: "einrichtung",
      validation: "nonempty",
      validationMessage: "Bitte gib den Namen eures Pflegedienstes ein.",
      transitions: [{ targetStepId: "plz-ambulant" }],
    },
    {
      id: "plz-ambulant",
      type: "free_text",
      phase: "Qualifizierung",
      message: "Was ist eure Postleitzahl?",
      variableName: "plz",
      validation: "plz",
      validationMessage: "Bitte gib eine gültige Postleitzahl ein.",
      transitions: [{ targetStepId: "qr-code" }],
    },

    // ─── FLOW_BILDUNG ───────────────────────────────────────────

    {
      id: "rolle-bildung",
      type: "list",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du an deiner Bildungseinrichtung?",
      variableName: "rolle",
      listButtonText: "Auswählen",
      options: [
        { id: "rb-sl", label: "Schulleitung", score: 40 },
        { id: "rb-doz", label: "Dozent / Lehrkraft", score: 25 },
        { id: "rb-pa", label: "Praxisanleitung", score: 30 },
        { id: "rb-pp", label: "Pflegepädagoge", score: 25 },
        { id: "rb-kl", label: "Kursleitung", score: 20 },
        { id: "rb-verw", label: "Verwaltung", score: 15 },
        { id: "rb-stud", label: "Student / Azubi", score: 5 },
      ],
      transitions: [{ targetStepId: "typ-bildung" }],
    },
    {
      id: "typ-bildung",
      type: "list",
      phase: "Qualifizierung",
      message: "Was für eine Einrichtung ist das?",
      variableName: "einrichtungstyp",
      listButtonText: "Auswählen",
      options: [
        { id: "tb-ps", label: "Pflegeschule", score: 20 },
        { id: "tb-bfs", label: "Berufsfachschule", score: 15 },
        { id: "tb-hs", label: "Hochschule / Uni", score: 10 },
        { id: "tb-fwb", label: "Weiterbildung", score: 15 },
        { id: "tb-vhs", label: "VHS / Erwachsene", score: 5 },
        { id: "tb-sonst", label: "Sonstige", score: 5 },
      ],
      transitions: [{ targetStepId: "name-bildung" }],
    },
    {
      id: "name-bildung",
      type: "free_text",
      phase: "Qualifizierung",
      message: "Wie heißt die Einrichtung?",
      variableName: "einrichtung",
      validation: "nonempty",
      validationMessage: "Bitte gib den Namen der Einrichtung ein.",
      transitions: [{ targetStepId: "qr-code" }],
    },

    // ─── FLOW_MEDIZINISCH ───────────────────────────────────────

    {
      id: "rolle-medizinisch",
      type: "list",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du in deiner Einrichtung?",
      variableName: "rolle",
      listButtonText: "Auswählen",
      options: [
        { id: "rm-kl", label: "Klinikleitung", score: 50 },
        { id: "rm-al", label: "Ärztliche Leitung", score: 40 },
        { id: "rm-pdl", label: "Pflegedienstleitung", score: 40 },
        { id: "rm-stl", label: "Stationsleitung", score: 30 },
        { id: "rm-thl", label: "Therapie-Leitung", score: 25 },
        { id: "rm-sd", label: "Sozialdienst", score: 20 },
        { id: "rm-fk", label: "Fachkraft", score: 10 },
        { id: "rm-verw", label: "Verwaltung", score: 15 },
      ],
      transitions: [{ targetStepId: "typ-medizinisch" }],
    },
    {
      id: "typ-medizinisch",
      type: "list",
      phase: "Qualifizierung",
      message: "Was für eine Einrichtung ist das?",
      variableName: "einrichtungstyp",
      listButtonText: "Auswählen",
      options: [
        { id: "tm-kh", label: "Krankenhaus / Klinik", score: 20 },
        { id: "tm-reha", label: "Rehaklinik", score: 15 },
        { id: "tm-ger", label: "Geriatrische Klinik", score: 20 },
        { id: "tm-tk", label: "Tagesklinik", score: 10 },
        { id: "tm-mvz", label: "MVZ", score: 10 },
        { id: "tm-hos", label: "Hospiz / Palliativ", score: 15 },
        { id: "tm-sonst", label: "Sonstige", score: 5 },
      ],
      transitions: [{ targetStepId: "name-medizinisch" }],
    },
    {
      id: "name-medizinisch",
      type: "free_text",
      phase: "Qualifizierung",
      message: "Wie heißt die Einrichtung?",
      variableName: "einrichtung",
      validation: "nonempty",
      validationMessage: "Bitte gib den Namen der Einrichtung ein.",
      transitions: [{ targetStepId: "qr-code" }],
    },

    // ─── FLOW_SONSTIGES ─────────────────────────────────────────

    {
      id: "typ-sonstiges",
      type: "list",
      phase: "Qualifizierung",
      message: "Was beschreibt dich am besten?",
      variableName: "typ",
      listButtonText: "Auswählen",
      options: [
        { id: "so-aus", label: "Aussteller", score: 10 },
        { id: "so-ber", label: "Berater / Consultant", score: 15 },
        { id: "so-ver", label: "Verband", score: 10 },
        { id: "so-pol", label: "Politik / Behörde", score: 5 },
        { id: "so-wiss", label: "Wissenschaft", score: 10 },
        { id: "so-press", label: "Presse / Medien", score: 15 },
        { id: "so-inv", label: "Investor / Partner", score: 30 },
        { id: "so-stud", label: "Student / Azubi", score: 5 },
        { id: "so-priv", label: "Privat", score: 5 },
      ],
      transitions: [{ targetStepId: "qr-code" }],
    },

    // ─── SHARED_END ─────────────────────────────────────────────

    {
      id: "qr-code",
      type: "qr",
      phase: "Aktivierung",
      qrMode: "session-data",
      message:
        "Dein persönlicher QR Code wird generiert...\n\nFertig! Halte den QR Code an den Scanner an unserem Stand.\n\nDas Glücksrad dreht sich auf dem großen Screen!",
      transitions: [{ targetStepId: "gewinn" }],
    },
    {
      id: "gewinn",
      type: "text",
      phase: "Aktivierung",
      message:
        "Jackpot Felix!\n\nDu hast 4 Wochen Felix für nur 100 Euro gewonnen (statt regulär 350 Euro)!\n\nInklusive Installation und Einweisung\nSuch dir sofort Preise am Counter aus!",
      transitions: [{ targetStepId: "produkt-info" }],
    },
    {
      id: "produkt-info",
      type: "text",
      phase: "Nurturing",
      message:
        "Übrigens, wusstest du schon?\n\nFelix ist das digitale Gesundheitsdisplay für stationäre Pflegeeinrichtungen.\n\nOhne Tablet, ohne Schulung\nSturzprävention, Musik und Biografiearbeit\n70+ Apps, 5.400+ Übungen\n\nSprich uns am Stand an!",
      transitions: [{ targetStepId: "produkt-video" }],
    },
    {
      id: "produkt-video",
      type: "video",
      phase: "Nurturing",
      message:
        "Felix in Aktion: So sieht der Alltag mit Felix in einer Pflegeeinrichtung aus.",
      transitions: [{ targetStepId: "bestandsgeraet" }],
    },
    {
      id: "bestandsgeraet",
      type: "buttons",
      phase: "Wettbewerbs Intel",
      message:
        "Kurze Rückfrage: Habt ihr bereits ein digitales Gerät in der sozialen Betreuung eurer Einrichtung?",
      variableName: "bestandsgeraet",
      options: [
        { id: "bg-ja", label: "Ja", score: 10 },
        { id: "bg-nein", label: "Nein", score: 5 },
      ],
      transitions: [
        {
          conditions: [
            { field: "bestandsgeraet", operator: "eq", value: "bg-ja" },
          ],
          targetStepId: "wettbewerber",
        },
        {
          conditions: [
            { field: "bestandsgeraet", operator: "eq", value: "bg-nein" },
          ],
          targetStepId: "werbe-opt-in",
        },
      ],
    },
    {
      id: "wettbewerber",
      type: "list",
      phase: "Wettbewerbs Intel",
      message: "Welchen Anbieter nutzt ihr bereits?",
      variableName: "wettbewerber",
      listButtonText: "Auswählen",
      options: [
        { id: "wb-hm", label: "Hello Mirrors" },
        { id: "wb-ct", label: "CareTable" },
        { id: "wb-bl", label: "BikeLabz" },
        { id: "wb-mb", label: "Mainboard" },
        { id: "wb-tt", label: "Tovertafel" },
        { id: "wb-sf", label: "SilverFit" },
        { id: "wb-other", label: "Etwas anderes" },
      ],
      transitions: [{ targetStepId: "wettbewerber-antwort" }],
    },
    {
      id: "wettbewerber-antwort",
      type: "text",
      phase: "Wettbewerbs Intel",
      message:
        "Danke! Ihr nutzt also {{wettbewerber_label}}.\n\nFalls ihr Felix mal testen wollt, sprecht uns gerne am Stand an!",
      transitions: [{ targetStepId: "werbe-opt-in" }],
    },
    {
      id: "werbe-opt-in",
      type: "buttons",
      phase: "Retention",
      message:
        "Eine letzte Frage: Dürfen wir dir ab und zu per WhatsApp nützliche Infos, Videos und Angebote rund um Felix schicken?\n\nDas ist freiwillig und hat keinen Einfluss auf deinen Gewinn. Du kannst jederzeit per Nachricht widerrufen.",
      variableName: "werbe_opt_in",
      options: [
        { id: "woi-ja", label: "Ja, gerne!", score: 10 },
        { id: "woi-nein", label: "Nein, danke", score: 0 },
      ],
      transitions: [{ targetStepId: "instagram" }],
    },
    {
      id: "instagram",
      type: "buttons",
      phase: "Retention",
      message:
        "Folgt ihr uns schon auf Instagram?\n\nRegelmäßig Updates, Gewinnspiele und Infos rund um Hello Mirrors.",
      variableName: "instagram",
      options: [
        { id: "ig-ja", label: "Ja, wir folgen schon" },
        { id: "ig-nein", label: "Nein, noch nicht" },
      ],
      transitions: [{ targetStepId: "abschluss" }],
    },
    {
      id: "abschluss",
      type: "text",
      phase: "Retention",
      message:
        "Super, dann verpasst ihr nichts!\n\nDanke fürs Mitmachen und viel Spaß auf der Messe. Bis bald!",
      transitions: [],
    },
  ] satisfies DialogStep[],
};

/**
 * Seeds or upserts the default trade-fair dialog by slug.
 *
 * Every startup reconciles the stored dialog definition to match the
 * definition in this file. This means the seed file is the source of
 * truth: edits made via the dialog editor UI will be overwritten on
 * next deploy. That is intentional for the campaign we are running.
 */
export const seedDefaultDialog = (): void => {
  const existing = listDialogs().find((d) => d.slug === DIALOG_SLUG);

  if (existing) {
    log.info("Reconciling existing default dialog from seed", {
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
  log.info("Default dialog seeded and activated", { dialogId: id });
};
