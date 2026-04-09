"use client";

import type { DialogStep } from "@/domain/dialog/dialog-schema";
import { renderTemplate } from "@/domain/dialog/template-engine";

interface WhatsappPreviewProps {
  step: DialogStep | null;
  variables?: Record<string, string>;
}

const DEFAULT_VARIABLES: Record<string, string> = {
  vorname: "Max",
  nachname: "Mustermann",
  name: "Max Mustermann",
  email: "max@beispiel.de",
  telefon: "0170 1234567",
  firma: "Musterfirma GmbH",
  plz: "50667",
};

const BotAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00B896] font-semibold text-sm text-white">
    F
  </div>
);

const BotBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <BotAvatar />
    <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
      {children}
    </div>
  </div>
);

const UserBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] rounded-lg rounded-br-none bg-[#DCF8C6] px-3 py-2 shadow-sm">
      {children}
    </div>
  </div>
);

const ButtonPill = ({ label }: { label: string }) => (
  <button
    className="w-full rounded-full border border-[#00B896] px-4 py-1.5 text-center text-[#00B896] text-sm transition-colors hover:bg-[#00B896]/10"
    type="button"
  >
    {label}
  </button>
);

const QrPlaceholder = () => (
  <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-gray-300 border-dashed bg-gray-50">
    <svg
      aria-label="QR-Code Platzhalter"
      className="h-12 w-12 text-gray-400"
      fill="none"
      role="img"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm14 3h.01M17 17h.01M14 14h3v3h-3v-3zm3 3h3v3h-3v-3z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  </div>
);

const VideoPlaceholder = ({ url }: { url?: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
    <svg
      aria-label="Video Platzhalter"
      className="h-8 w-8 shrink-0 text-gray-400"
      fill="none"
      role="img"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
    <span className="truncate text-gray-500 text-sm">
      {url ?? "Video-Link"}
    </span>
  </div>
);

const resolveMessage = (
  message: string,
  variables?: Record<string, string>
): string => {
  const merged = { ...DEFAULT_VARIABLES, ...variables };
  return renderTemplate(message, merged);
};

export const WhatsappPreview = ({ step, variables }: WhatsappPreviewProps) => {
  if (!step) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl bg-[#ECE5DD] p-6">
        <p className="text-gray-500 text-sm">
          Wähle einen Schritt aus der Liste
        </p>
      </div>
    );
  }

  const message = resolveMessage(step.message, variables);
  const firstOption = step.options?.[0];

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[#ECE5DD] p-4">
      {/* Bot message */}
      <BotBubble>
        {step.header && (
          <p className="mb-1 font-semibold text-sm">{step.header}</p>
        )}
        <p className="whitespace-pre-line text-sm">{message}</p>
        {step.footer && (
          <p className="mt-1 text-gray-500 text-xs">{step.footer}</p>
        )}
      </BotBubble>

      {/* Type-specific elements */}
      {step.type === "buttons" && step.options && (
        <div className="ml-10 flex max-w-[85%] flex-col gap-1.5">
          {step.options.map((option) => (
            <ButtonPill key={option.id} label={option.label} />
          ))}
        </div>
      )}

      {step.type === "list" && (
        <div className="ml-10 flex max-w-[85%] flex-col gap-2">
          <ButtonPill label={step.listButtonText ?? "Optionen anzeigen"} />
          {step.options && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {step.options.map((option) => (
                <div
                  className="border-gray-100 border-b px-3 py-2 last:border-b-0"
                  key={option.id}
                >
                  <p className="text-sm">{option.label}</p>
                  {option.description && (
                    <p className="text-gray-500 text-xs">
                      {option.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step.type === "free_text" && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-lg border-2 border-gray-300 border-dashed bg-white/50 px-3 py-2">
            <p className="text-gray-400 text-sm">Texteingabe...</p>
          </div>
        </div>
      )}

      {step.type === "qr" && (
        <div className="ml-10">
          <QrPlaceholder />
          {step.qrCaption && (
            <p className="mt-1 text-gray-500 text-xs">{step.qrCaption}</p>
          )}
        </div>
      )}

      {step.type === "video" && (
        <div className="ml-10 max-w-[85%]">
          <VideoPlaceholder url={step.videoUrl} />
        </div>
      )}

      {/* User response bubble */}
      {step.type === "buttons" && firstOption && (
        <UserBubble>
          <p className="text-sm">{firstOption.label}</p>
        </UserBubble>
      )}

      {step.type === "list" && firstOption && (
        <UserBubble>
          <p className="text-sm">{firstOption.label}</p>
        </UserBubble>
      )}

      {step.type === "free_text" && (
        <UserBubble>
          <p className="text-gray-600 text-sm">Beispielantwort</p>
        </UserBubble>
      )}
    </div>
  );
};
