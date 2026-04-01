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
  sendQr?: {
    content: string;
    caption: string;
  };
  text: string;
}
