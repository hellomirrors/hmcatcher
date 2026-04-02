import { z } from "zod/v4";

export const STAR_TO_RELEVANCE: Record<number, string> = {
  5: "HM4201",
  4: "HM5201",
  3: "HM6201",
  2: "HM7201",
  1: "HM8201",
};

const DEFAULT_MESSAGES = {
  welcome:
    "Willkommen bei Hellomirror! 👋\nIch helfe dir, deine Kontaktdaten zu erfassen.\n\nWie ist dein Vorname?",
  welcome_webform:
    "Willkommen bei Hellomirror! 👋\nBitte fülle das kurze Formular aus, um deinen persönlichen QR-Code zu erhalten:\n\n{link}",
  ask_first_name: "Wie ist dein Vorname?",
  ask_last_name: "Danke! Und dein Nachname?",
  ask_position: "Was ist deine Position / Berufsbezeichnung?",
  ask_email: "Wie lautet deine E-Mail-Adresse? 📧",
  ask_consent:
    "Ich möchte deine Daten speichern und dir deinen persönlichen QR-Code senden. Bist du damit einverstanden?",
  complete: "Vielen Dank! Hier ist dein persönlicher QR-Code! 🎉",
  empty_first_name: "Bitte gib deinen Vornamen ein.",
  empty_last_name: "Bitte gib deinen Nachnamen ein.",
  invalid_email:
    "Das sieht nicht nach einer gültigen E-Mail-Adresse aus. Bitte versuche es erneut.",
  consent_declined:
    "Kein Problem! Deine Daten wurden nicht gespeichert. Du kannst jederzeit mit /start neu beginnen.",
  type_position: "Bitte tippe deine Position ein:",
  invalid_consent: "Bitte wähle eine der Optionen.",
};

const DEFAULT_UI = {
  position_list_title: "Position auswählen",
  position_list_body: "Wähle deine Position aus der Liste oder tippe sie ein.",
  position_list_button: "Position wählen",
  consent_yes_label: "Ja ✅",
  consent_no_label: "Nein ❌",
  qr_caption_template: "Hallo {firstName}, hier ist dein persönlicher QR-Code!",
};

const DEFAULT_ROLES = [
  { id: "pos_pdl", title: "Pflegedienstleitung", stars: 5 },
  { id: "pos_wbl", title: "Wohnbereichsleitung", stars: 5 },
  { id: "pos_el", title: "Einrichtungsleitung", stars: 5 },
  { id: "pos_pfk", title: "Pflegefachkraft", stars: 4 },
  { id: "pos_pa", title: "Pflegeassistenz", stars: 3 },
  { id: "pos_bt", title: "Betreuungskraft", stars: 3 },
  { id: "pos_vw", title: "Verwaltung", stars: 2 },
  { id: "pos_qm", title: "Qualitätsmanagement", stars: 4 },
  { id: "pos_it", title: "IT / Digitalisierung", stars: 3 },
  { id: "pos_gl", title: "Geschäftsleitung", stars: 5 },
  { id: "pos_other", title: "Andere (bitte eintippen)", stars: 1 },
];

const DEFAULT_KEYWORDS = {
  highRelevance: ["leit", "führ"],
  highRelevanceStars: 5,
  defaultStars: 1,
};

const roleSchema = z.object({
  id: z.string(),
  title: z.string(),
  stars: z.number().min(1).max(5),
});

export const conversationConfigSchema = z.object({
  messages: z
    .object({
      welcome: z.string(),
      welcome_webform: z.string(),
      ask_first_name: z.string(),
      ask_last_name: z.string(),
      ask_position: z.string(),
      ask_email: z.string(),
      ask_consent: z.string(),
      complete: z.string(),
      empty_first_name: z.string(),
      empty_last_name: z.string(),
      invalid_email: z.string(),
      consent_declined: z.string(),
      type_position: z.string(),
      invalid_consent: z.string(),
    })
    .default(DEFAULT_MESSAGES),
  ui: z
    .object({
      position_list_title: z.string(),
      position_list_body: z.string(),
      position_list_button: z.string(),
      consent_yes_label: z.string(),
      consent_no_label: z.string(),
      qr_caption_template: z.string(),
    })
    .default(DEFAULT_UI),
  roles: z.array(roleSchema).default(DEFAULT_ROLES),
  customPositionKeywords: z
    .object({
      highRelevance: z.array(z.string()),
      highRelevanceStars: z.number().min(1).max(5),
      defaultStars: z.number().min(1).max(5),
    })
    .default(DEFAULT_KEYWORDS),
});

export type ConversationConfig = z.infer<typeof conversationConfigSchema>;
export type Role = z.infer<typeof roleSchema>;
