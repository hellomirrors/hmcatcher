export interface TextMessage {
  body: string;
  to: string;
}

export interface ImageMessage {
  caption?: string;
  imageBuffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  to: string;
}

export interface DocumentMessage {
  caption?: string;
  documentBuffer: Buffer;
  filename: string;
  mimeType: string;
  to: string;
}

export interface ButtonOption {
  id: string;
  title: string;
}

export interface ButtonMessage {
  body: string;
  buttons: ButtonOption[];
  footer?: string;
  header?: string;
  to: string;
}

export interface ListRow {
  description?: string;
  id: string;
  title: string;
}

export interface ListSection {
  rows: ListRow[];
  title: string;
}

export interface ListMessage {
  body: string;
  buttonText: string;
  footer?: string;
  sections: ListSection[];
  title: string;
  to: string;
}

export interface SendResult {
  messageId: string;
  provider: string;
}

export interface InboundMessage {
  body: string;
  from: string;
  provider: string;
  rawPayload: unknown;
  timestamp: Date;
  to: string;
}

export interface MessagingProvider {
  readonly name: string;
  sendButtons(message: ButtonMessage): Promise<SendResult>;
  sendDocument(message: DocumentMessage): Promise<SendResult>;
  sendImage(message: ImageMessage): Promise<SendResult>;
  sendList(message: ListMessage): Promise<SendResult>;
  sendText(message: TextMessage): Promise<SendResult>;
}
