import type { ButtonOption, ListSection } from "@/domain/types";

export type ConversationStep =
  | "welcome"
  | "ask_first_name"
  | "ask_last_name"
  | "ask_position"
  | "ask_email"
  | "ask_consent"
  | "complete";

export interface ConversationSession {
  createdAt: Date;
  data: ConversationData;
  step: ConversationStep;
  updatedAt: Date;
}

export interface ConversationData {
  consent?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
}

export interface ConversationResponse {
  buttons?: ButtonOption[];
  list?: {
    body: string;
    buttonText: string;
    sections: ListSection[];
    title: string;
  };
  sendQr?: {
    caption: string;
    content: string;
  };
  text: string;
}
