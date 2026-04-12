"use client";

import type { DialogStep } from "@/domain/dialog/dialog-schema";
import { renderTemplate } from "@/domain/dialog/template-engine";
import {
  BotBubble,
  ButtonPill,
  QrPlaceholder,
  UserBubble,
  VideoPlaceholder,
} from "./simulator/shared-bubbles";

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
