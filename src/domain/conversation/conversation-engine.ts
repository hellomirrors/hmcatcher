import { z } from "zod/v4";
import {
  type ConversationConfig,
  STAR_TO_RELEVANCE,
} from "@/domain/configuration/configuration-schema";
import { readConfigurationSync } from "@/domain/configuration/configuration-service";
import { deleteSession, getSession, setSession } from "./session-store";
import type { ConversationResponse, ConversationSession } from "./types";

const emailSchema = z.email("Ungültige E-Mail-Adresse.");

function getConfig(): ConversationConfig {
  return readConfigurationSync();
}

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

function buildPositionResponse(
  config: ConversationConfig
): ConversationResponse {
  return {
    text: config.messages.ask_position,
    list: {
      title: config.ui.position_list_title,
      body: config.ui.position_list_body,
      buttonText: config.ui.position_list_button,
      sections: [{ title: "Positionen", rows: config.roles }],
    },
  };
}

function buildConsentResponse(
  config: ConversationConfig
): ConversationResponse {
  return {
    text: config.messages.ask_consent,
    buttons: [
      { id: "consent_yes", title: config.ui.consent_yes_label },
      { id: "consent_no", title: config.ui.consent_no_label },
    ],
  };
}

function isConsentYes(text: string, config: ConversationConfig): boolean {
  const normalized = text.trim().toLowerCase();
  const yesLabel = config.ui.consent_yes_label.toLowerCase();
  return (
    normalized === "ja" ||
    normalized === "yes" ||
    normalized === "j" ||
    normalized === yesLabel ||
    normalized === "consent_yes"
  );
}

function isConsentNo(text: string, config: ConversationConfig): boolean {
  const normalized = text.trim().toLowerCase();
  const noLabel = config.ui.consent_no_label.toLowerCase();
  return (
    normalized === "nein" ||
    normalized === "no" ||
    normalized === "n" ||
    normalized === noLabel ||
    normalized === "consent_no"
  );
}

function getRelevanceForPosition(
  positionId: string | undefined,
  customPosition: string | undefined,
  config: ConversationConfig
): string {
  if (positionId && positionId !== "pos_other") {
    const role = config.roles.find((r) => r.id === positionId);
    if (role) {
      return STAR_TO_RELEVANCE[role.stars] ?? "HM8201";
    }
  }

  if (customPosition) {
    const lower = customPosition.toLowerCase();
    const keywords = config.customPositionKeywords;
    const isHighRelevance = keywords.highRelevance.some((kw) =>
      lower.includes(kw.toLowerCase())
    );
    if (isHighRelevance) {
      return STAR_TO_RELEVANCE[keywords.highRelevanceStars] ?? "HM4201";
    }
    return STAR_TO_RELEVANCE[keywords.defaultStars] ?? "HM8201";
  }

  return "HM8201";
}

export function handleInboundMessage(
  provider: string,
  userId: string,
  text: string
): ConversationResponse {
  const config = getConfig();
  let session = getSession(provider, userId);

  if (!session || isStartCommand(text)) {
    session = createNewSession();
    session.step = "ask_first_name";
    setSession(provider, userId, session);
    return { text: config.messages.welcome };
  }

  const trimmed = text.trim();

  switch (session.step) {
    case "ask_first_name": {
      if (trimmed.length === 0) {
        return { text: config.messages.empty_first_name };
      }
      session.data.firstName = trimmed;
      session.step = "ask_last_name";
      setSession(provider, userId, session);
      return { text: config.messages.ask_last_name };
    }

    case "ask_last_name": {
      if (trimmed.length === 0) {
        return { text: config.messages.empty_last_name };
      }
      session.data.lastName = trimmed;
      session.step = "ask_position";
      setSession(provider, userId, session);
      return buildPositionResponse(config);
    }

    case "ask_position": {
      if (trimmed.length === 0) {
        return buildPositionResponse(config);
      }
      const role = config.roles.find((r) => r.id === trimmed);
      if (role && trimmed !== "pos_other") {
        session.data.position = role.title;
        session.data.positionId = role.id;
      } else if (trimmed === "pos_other") {
        return { text: config.messages.type_position };
      } else {
        session.data.position = trimmed;
        session.data.positionId = undefined;
      }
      session.step = "ask_email";
      setSession(provider, userId, session);
      return { text: config.messages.ask_email };
    }

    case "ask_email": {
      const result = emailSchema.safeParse(trimmed);
      if (!result.success) {
        return { text: config.messages.invalid_email };
      }
      session.data.email = result.data;
      session.step = "ask_consent";
      setSession(provider, userId, session);
      return buildConsentResponse(config);
    }

    case "ask_consent": {
      if (isConsentYes(trimmed, config)) {
        session.data.consent = true;
        session.step = "complete";

        const relevance = getRelevanceForPosition(
          session.data.positionId,
          session.data.position,
          config
        );

        const qrContent = JSON.stringify({
          firstName: session.data.firstName,
          lastName: session.data.lastName,
          name: `${session.data.firstName} ${session.data.lastName}`,
          position: session.data.position,
          email: session.data.email,
          relevance,
        });

        const caption = config.ui.qr_caption_template.replace(
          "{firstName}",
          session.data.firstName ?? ""
        );

        deleteSession(provider, userId);

        return {
          text: config.messages.complete,
          sendQr: { content: qrContent, caption },
        };
      }

      if (isConsentNo(trimmed, config)) {
        deleteSession(provider, userId);
        return { text: config.messages.consent_declined };
      }

      return buildConsentResponse(config);
    }

    default: {
      session = createNewSession();
      session.step = "ask_first_name";
      setSession(provider, userId, session);
      return { text: config.messages.welcome };
    }
  }
}
