import { createLogger } from "@/lib/logger";
import {
  createDialog,
  listDialogs,
  setActiveDialog,
} from "./dialog-repository";
import type { DialogDefinition, DialogStep } from "./dialog-schema";

const log = createLogger("dialog-seed");

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
  steps: [
    // ─── SHARED_START ───────────────────────────────────────────

    {
      id: "welcome",
      type: "buttons",
      phase: "Onboarding",
      message:
        "Willkommen beim Felix Gewinnspiel!\n\nWenn du mitmachen möchtest, bestätige mit 'Ja' und nimm automatisch an unserem Gewinnspiel teil.\n\nMit deiner Teilnahme akzeptierst du unsere Teilnahmebedingungen und Datenschutzhinweise:\nhellomirrors.com/essen",
      options: [{ id: "welcome-ja", label: "Ja, ich möchte teilnehmen" }],
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
      type: "buttons",
      phase: "Qualifizierung",
      message: "In welchem Bereich arbeitest du?",
      variableName: "arbeitsbereich",
      options: [
        { id: "ab-stationaer", label: "Stationäre Pflege" },
        { id: "ab-ambulant", label: "Ambulante Pflege" },
        { id: "ab-bildung", label: "Bildungseinrichtung" },
        { id: "ab-medizinisch", label: "Medizinische Einrichtung" },
        { id: "ab-sonstiges", label: "Sonstiges" },
      ],
      transitions: [
        {
          conditions: [
            {
              field: "arbeitsbereich",
              operator: "eq",
              value: "Stationäre Pflege",
            },
          ],
          targetStepId: "rolle-stationaer",
        },
        {
          conditions: [
            {
              field: "arbeitsbereich",
              operator: "eq",
              value: "Ambulante Pflege",
            },
          ],
          targetStepId: "rolle-ambulant",
        },
        {
          conditions: [
            {
              field: "arbeitsbereich",
              operator: "eq",
              value: "Bildungseinrichtung",
            },
          ],
          targetStepId: "rolle-bildung",
        },
        {
          conditions: [
            {
              field: "arbeitsbereich",
              operator: "eq",
              value: "Medizinische Einrichtung",
            },
          ],
          targetStepId: "rolle-medizinisch",
        },
        {
          conditions: [
            { field: "arbeitsbereich", operator: "eq", value: "Sonstiges" },
          ],
          targetStepId: "typ-sonstiges",
        },
      ],
    },

    // ─── FLOW_STATIONAER ────────────────────────────────────────

    {
      id: "rolle-stationaer",
      type: "buttons",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du in deiner Einrichtung?",
      variableName: "rolle",
      options: [
        { id: "rs-el", label: "Einrichtungsleitung / Heimleitung", score: 50 },
        { id: "rs-stel", label: "Stellv. Einrichtungsleitung", score: 50 },
        { id: "rs-pdl", label: "Pflegedienstleitung (PDL)", score: 50 },
        { id: "rs-wbl", label: "Wohnbereichsleitung (WBL)", score: 30 },
        { id: "rs-lsb", label: "Leitung Soziale Betreuung", score: 50 },
        { id: "rs-qm", label: "Qualitätsbeauftragte/r (QM)", score: 50 },
        { id: "rs-vl", label: "Verwaltungsleitung", score: 30 },
        { id: "rs-pfk", label: "Pflegefachkraft (examiniert)", score: 10 },
        { id: "rs-phk", label: "Pflegehilfskraft", score: 10 },
        { id: "rs-43b", label: "Betreuungskraft (43b SGB XI)", score: 10 },
        { id: "rs-thera", label: "Therapeut/in (Physio/Ergo/Logo)", score: 10 },
        { id: "rs-hw", label: "Hauswirtschaft / Haustechnik", score: 10 },
        { id: "rs-azubi", label: "Azubi / FSJ / BFD", score: 10 },
        { id: "rs-sonst", label: "Sonstige", score: 10 },
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
        { id: "ts-priv", label: "Privat" },
        { id: "ts-oeff", label: "Öffentlich / Kommunal" },
        { id: "ts-frei", label: "Freigemeinnützig / Kirchlich" },
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
      type: "buttons",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du in deinem Pflegedienst?",
      variableName: "rolle",
      options: [
        { id: "ra-gf", label: "Geschäftsführung / Inhaber" },
        { id: "ra-pdl", label: "Pflegedienstleitung (PDL)" },
        { id: "ra-spdl", label: "Stellv. PDL" },
        { id: "ra-qm", label: "Qualitätsmanagement" },
        { id: "ra-tl", label: "Teamleitung / Einsatzleitung" },
        { id: "ra-pfk", label: "Pflegefachkraft" },
        { id: "ra-bk", label: "Betreuungskraft" },
        { id: "ra-verw", label: "Verwaltung / Büro" },
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
      type: "buttons",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du an deiner Bildungseinrichtung?",
      variableName: "rolle",
      options: [
        { id: "rb-sl", label: "Schulleitung / Akademieleitung" },
        { id: "rb-doz", label: "Dozent / Lehrkraft" },
        { id: "rb-pa", label: "Praxisanleiter / Praxiskoordinator" },
        { id: "rb-pp", label: "Pflegepädagoge" },
        { id: "rb-kl", label: "Kursleitung / Seminarleitung" },
        { id: "rb-verw", label: "Verwaltung / Organisation" },
        { id: "rb-stud", label: "Student / Auszubildender" },
      ],
      transitions: [{ targetStepId: "typ-bildung" }],
    },
    {
      id: "typ-bildung",
      type: "buttons",
      phase: "Qualifizierung",
      message: "Was für eine Einrichtung ist das?",
      variableName: "einrichtungstyp",
      options: [
        { id: "tb-ps", label: "Pflegeschule / Altenpflegeschule" },
        { id: "tb-bfs", label: "Berufsfachschule Pflege" },
        { id: "tb-hs", label: "Hochschule / Universität" },
        { id: "tb-fwb", label: "Fort- und Weiterbildungsinstitut" },
        { id: "tb-vhs", label: "Volkshochschule / Erwachsenenbildung" },
        { id: "tb-sonst", label: "Sonstige Bildungseinrichtung" },
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
      type: "buttons",
      phase: "Qualifizierung",
      message: "Welche Rolle hast du in deiner Einrichtung?",
      variableName: "rolle",
      options: [
        { id: "rm-kl", label: "Klinikleitung / Geschäftsführung" },
        { id: "rm-al", label: "Ärztliche Leitung" },
        { id: "rm-pdl", label: "Pflegedienstleitung" },
        { id: "rm-stl", label: "Stationsleitung" },
        { id: "rm-thl", label: "Therapeutische Leitung" },
        { id: "rm-sd", label: "Sozialdienst" },
        { id: "rm-fk", label: "Fachkraft (Pflege/Therapie)" },
        { id: "rm-verw", label: "Verwaltung" },
      ],
      transitions: [{ targetStepId: "typ-medizinisch" }],
    },
    {
      id: "typ-medizinisch",
      type: "buttons",
      phase: "Qualifizierung",
      message: "Was für eine Einrichtung ist das?",
      variableName: "einrichtungstyp",
      options: [
        { id: "tm-kh", label: "Krankenhaus / Klinik" },
        { id: "tm-reha", label: "Rehabilitationsklinik" },
        { id: "tm-ger", label: "Geriatrische Klinik" },
        { id: "tm-tk", label: "Tagesklinik" },
        { id: "tm-mvz", label: "MVZ (Med. Versorgungszentrum)" },
        { id: "tm-hos", label: "Hospiz / Palliativstation" },
        { id: "tm-sonst", label: "Sonstige med. Einrichtung" },
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
      type: "buttons",
      phase: "Qualifizierung",
      message: "Was beschreibt dich am besten?",
      variableName: "typ",
      options: [
        { id: "so-aus", label: "Aussteller / Anbieter" },
        { id: "so-ber", label: "Berater / Consultant" },
        { id: "so-ver", label: "Verband / Interessenvertretung" },
        { id: "so-pol", label: "Politik / Behörde" },
        { id: "so-wiss", label: "Wissenschaft / Forschung" },
        { id: "so-press", label: "Presse / Medien" },
        { id: "so-inv", label: "Investor / Partner" },
        { id: "so-stud", label: "Student / Auszubildender" },
        { id: "so-priv", label: "Privatperson / Angehöriger" },
      ],
      transitions: [{ targetStepId: "qr-code" }],
    },

    // ─── SHARED_END ─────────────────────────────────────────────

    {
      id: "qr-code",
      type: "qr",
      phase: "Aktivierung",
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
        { id: "bg-ja", label: "Ja" },
        { id: "bg-nein", label: "Nein" },
      ],
      transitions: [
        {
          conditions: [
            { field: "bestandsgeraet", operator: "eq", value: "Ja" },
          ],
          targetStepId: "wettbewerber",
        },
        {
          conditions: [
            { field: "bestandsgeraet", operator: "eq", value: "Nein" },
          ],
          targetStepId: "werbe-opt-in",
        },
      ],
    },
    {
      id: "wettbewerber",
      type: "buttons",
      phase: "Wettbewerbs Intel",
      message: "Welchen Anbieter nutzt ihr bereits?",
      variableName: "wettbewerber",
      options: [
        { id: "wb-hm", label: "Hello Mirrors / Felix" },
        { id: "wb-ct", label: "CareTable" },
        { id: "wb-bl", label: "BikeLabz TV / Aktivtisch" },
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
        "Danke! Ihr nutzt also {{wettbewerber}}.\n\nFalls ihr Felix mal testen wollt, sprecht uns gerne am Stand an!",
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
        { id: "woi-ja", label: "Ja, gerne!" },
        { id: "woi-nein", label: "Nein, danke" },
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

export const seedDefaultDialog = (): void => {
  const existing = listDialogs();
  if (existing.length > 0) {
    log.info("Dialogs already exist, skipping seed", {
      count: existing.length,
    });
    return;
  }

  log.info("No dialogs found, seeding default dialog...");

  const id = createDialog({
    name: "Felix Gewinnspiel — Altenpflege Essen 2026",
    slug: "altenpflege-essen-2026",
    description:
      "Interaktives Gewinnspiel für den Hello Mirrors Stand auf der Altenpflege Messe Essen 2026",
    definition: defaultDefinition,
  });

  setActiveDialog(id);

  log.info("Default dialog seeded and activated", { dialogId: id });
};
