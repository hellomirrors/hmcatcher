import { z } from "zod/v4";
import { deleteSession, getSession, setSession } from "./session-store";
import type {
  ConversationResponse,
  ConversationSession,
  ConversationStep,
} from "./types";

const emailSchema = z.email("Bitte eine gültige E-Mail-Adresse eingeben.");

const MESSAGES: Record<ConversationStep, string> = {
  welcome:
    "Willkommen bei Hellomirror! 👋\nIch helfe dir, deine Kontaktdaten zu erfassen.\n\nWie ist dein Vorname?",
  ask_first_name: "Wie ist dein Vorname?",
  ask_last_name: "Danke! Und dein Nachname?",
  ask_position: "Was ist deine Position / Berufsbezeichnung?",
  ask_email: "Wie lautet deine E-Mail-Adresse?",
  ask_consent:
    'Ich möchte deine Daten speichern und dir deinen persönlichen QR-Code senden. Bist du damit einverstanden?\n\nAntworte mit "Ja" oder "Nein".',
  complete: "Vielen Dank! Hier ist dein persönlicher QR-Code! 🎉",
};

function createNewSession(): ConversationSession {
  const now = new Date();
  return {
    step: "welcome",
    data: {},
    createdAt: now,
    updatedAt: now,
  };
}

function isStartCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized === "/start" ||
    normalized === "start" ||
    normalized === "hallo" ||
    normalized === "hi" ||
    normalized === "hello"
  );
}

function isConsentYes(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "ja" || normalized === "yes" || normalized === "j";
}

function isConsentNo(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "nein" || normalized === "no" || normalized === "n";
}

export function handleInboundMessage(
  provider: string,
  userId: string,
  text: string
): ConversationResponse {
  let session = getSession(provider, userId);

  if (!session || isStartCommand(text)) {
    session = createNewSession();
    session.step = "ask_first_name";
    setSession(provider, userId, session);
    return { text: MESSAGES.welcome };
  }

  const trimmed = text.trim();

  switch (session.step) {
    case "ask_first_name": {
      if (trimmed.length === 0) {
        return { text: "Bitte gib deinen Vornamen ein." };
      }
      session.data.firstName = trimmed;
      session.step = "ask_last_name";
      setSession(provider, userId, session);
      return { text: MESSAGES.ask_last_name };
    }

    case "ask_last_name": {
      if (trimmed.length === 0) {
        return { text: "Bitte gib deinen Nachnamen ein." };
      }
      session.data.lastName = trimmed;
      session.step = "ask_position";
      setSession(provider, userId, session);
      return { text: MESSAGES.ask_position };
    }

    case "ask_position": {
      if (trimmed.length === 0) {
        return { text: "Bitte gib deine Position ein." };
      }
      session.data.position = trimmed;
      session.step = "ask_email";
      setSession(provider, userId, session);
      return { text: MESSAGES.ask_email };
    }

    case "ask_email": {
      const result = emailSchema.safeParse(trimmed);
      if (!result.success) {
        return {
          text: "Das sieht nicht nach einer gültigen E-Mail-Adresse aus. Bitte versuche es erneut.",
        };
      }
      session.data.email = result.data;
      session.step = "ask_consent";
      setSession(provider, userId, session);
      return { text: MESSAGES.ask_consent };
    }

    case "ask_consent": {
      if (isConsentYes(trimmed)) {
        session.data.consent = true;
        session.step = "complete";

        const qrContent = JSON.stringify({
          name: `${session.data.firstName} ${session.data.lastName}`,
          position: session.data.position,
          email: session.data.email,
        });

        deleteSession(provider, userId);

        return {
          text: MESSAGES.complete,
          sendQr: {
            content: qrContent,
            caption: `Hallo ${session.data.firstName}, hier ist dein persönlicher QR-Code!`,
          },
        };
      }

      if (isConsentNo(trimmed)) {
        deleteSession(provider, userId);
        return {
          text: "Kein Problem! Deine Daten wurden nicht gespeichert. Du kannst jederzeit mit /start neu beginnen.",
        };
      }

      return {
        text: 'Bitte antworte mit "Ja" oder "Nein".',
      };
    }

    default: {
      session = createNewSession();
      session.step = "ask_first_name";
      setSession(provider, userId, session);
      return { text: MESSAGES.welcome };
    }
  }
}
