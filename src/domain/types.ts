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
  sendImage(message: ImageMessage): Promise<SendResult>;
  sendText(message: TextMessage): Promise<SendResult>;
}
