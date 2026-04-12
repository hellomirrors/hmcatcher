"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DialogResponse } from "@/domain/dialog/dialog-engine";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import {
  BotAvatar,
  ButtonPill,
  QrPlaceholder,
  SystemBubble,
  UserBubble,
  VideoPlaceholder,
} from "./shared-bubbles";
import type { SimulatorMessage } from "./simulator-store";

interface ChatMessageProps {
  isLatestBotMessage: boolean;
  message: SimulatorMessage;
  onSelectOption: (label: string) => void;
}

function BotMessageContent({
  response,
  isLatestBotMessage,
  onSelectOption,
}: {
  isLatestBotMessage: boolean;
  onSelectOption: (label: string) => void;
  response: DialogResponse;
}) {
  return (
    <>
      {response.header && (
        <p className="mb-1 font-semibold text-sm">{response.header}</p>
      )}
      <p className="whitespace-pre-line text-sm">{response.text}</p>
      {response.footer && (
        <p className="mt-1 text-gray-500 text-xs">{response.footer}</p>
      )}

      {response.type === "buttons" && response.buttons && (
        <div className="mt-2 flex flex-col gap-1.5">
          {response.buttons.map((btn) => (
            <ButtonPill
              disabled={!isLatestBotMessage}
              key={btn.id}
              label={btn.title}
              onClick={() => onSelectOption(btn.title)}
            />
          ))}
        </div>
      )}

      {response.type === "list" && response.list && (
        <div className="mt-2">
          {isLatestBotMessage ? (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {response.list.sections.map((section) => (
                <div key={section.title}>
                  {response.list?.sections.length &&
                    response.list.sections.length > 1 && (
                      <div className="border-gray-100 border-b bg-gray-50 px-3 py-1 font-medium text-gray-600 text-xs">
                        {section.title}
                      </div>
                    )}
                  {section.rows.map((row) => (
                    <button
                      className="w-full border-gray-100 border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                      key={row.id}
                      onClick={() => onSelectOption(row.title)}
                      type="button"
                    >
                      <p className="text-sm">{row.title}</p>
                      {row.description && (
                        <p className="text-gray-500 text-xs">
                          {row.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded border border-gray-200 px-3 py-1.5 text-gray-400 text-xs">
              Liste (
              {response.list.sections.reduce((n, s) => n + s.rows.length, 0)}{" "}
              Optionen)
            </div>
          )}
        </div>
      )}

      {response.type === "qr" && (
        <div className="mt-2">
          <QrPlaceholder />
          {response.qr?.caption && (
            <p className="mt-1 text-gray-500 text-xs">{response.qr.caption}</p>
          )}
        </div>
      )}

      {response.type === "video" && (
        <div className="mt-2">
          <VideoPlaceholder url={response.videoUrl} />
        </div>
      )}
    </>
  );
}

export function ChatMessage({
  message,
  isLatestBotMessage,
  onSelectOption,
}: ChatMessageProps) {
  const focusStepsStep = useDialogEditorStore((s) => s.focusStepsStep);

  if (message.sender === "system") {
    return <SystemBubble>{message.text}</SystemBubble>;
  }

  if (message.sender === "user") {
    return (
      <UserBubble>
        <p className="text-sm">{message.text}</p>
      </UserBubble>
    );
  }

  // Bot message
  return (
    <div className="group flex items-start gap-2">
      <BotAvatar />
      <div className="relative max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
        {message.response ? (
          <BotMessageContent
            isLatestBotMessage={isLatestBotMessage}
            onSelectOption={onSelectOption}
            response={message.response}
          />
        ) : (
          <p className="whitespace-pre-line text-sm">{message.text}</p>
        )}

        {message.stepId && (
          <Button
            className="absolute -top-1 -right-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => {
              if (message.stepId) {
                focusStepsStep(message.stepId);
              }
            }}
            size="icon-xs"
            title="Schritt bearbeiten"
            type="button"
            variant="secondary"
          >
            <Pencil className="size-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
