"use client";

import { Code, Pencil } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DialogResponse } from "@/domain/dialog/dialog-engine";
import type { ScoreBucket } from "@/domain/dialog/dialog-schema";
import { resolveBucket } from "@/domain/dialog/score-buckets";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import {
  BotAvatar,
  ButtonPill,
  SystemBubble,
  UserBubble,
  VideoPlaceholder,
} from "./shared-bubbles";
import type { SimulatorMessage } from "./simulator-store";
import { useSimulatorStore } from "./simulator-store";

interface ChatMessageProps {
  isLatestBotMessage: boolean;
  message: SimulatorMessage;
  onSelectOption: (label: string) => void;
  scoreBuckets?: ScoreBucket[];
}

function BotMessageContent({
  response,
  isLatestBotMessage,
  onSelectOption,
  scoreBuckets,
}: {
  isLatestBotMessage: boolean;
  onSelectOption: (label: string) => void;
  response: DialogResponse;
  scoreBuckets?: ScoreBucket[];
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
        <SimulatorQrCode
          caption={response.qr?.caption}
          mode={response.qr?.mode ?? "template"}
          scoreBuckets={scoreBuckets}
          templateContent={response.qr?.content}
        />
      )}

      {response.type === "video" && (
        <div className="mt-2">
          <VideoPlaceholder url={response.videoUrl} />
        </div>
      )}

      {/* "Weiter" button for output-only steps that don't auto-advance */}
      {isLatestBotMessage &&
        (response.type === "qr" || response.type === "video") && (
          <div className="mt-2">
            <ButtonPill
              label="Weiter"
              onClick={() => onSelectOption("weiter")}
            />
          </div>
        )}
    </>
  );
}

export function ChatMessage({
  message,
  isLatestBotMessage,
  onSelectOption,
  scoreBuckets,
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
            scoreBuckets={scoreBuckets}
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

// ---------------------------------------------------------------------------
// QR code component for the simulator — generates a real QR image client-side
// ---------------------------------------------------------------------------

const MESSE_QR_SEPARATOR = "1a2b3c4d5e6f7g8h9i";

function buildSessionDataJson(
  variables: Record<string, string>,
  score: number,
  scoreBuckets?: ScoreBucket[]
): { json: string; base64: string } {
  const bucket = resolveBucket(score, scoreBuckets);
  if (!variables._sessionId) {
    console.warn(
      "[simulator] buildSessionDataJson called without _sessionId — QR will carry a fallback id"
    );
  }
  const data = {
    sessionId: variables._sessionId ?? `sim-fallback-${Date.now()}`,
    vorname: variables.vorname ?? "",
    bucket: bucket?.id ?? "",
  };
  const json = JSON.stringify(data);
  const base64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(json)))
      : json;
  return { json, base64 };
}

function buildMesseQr(
  variables: Record<string, string>,
  score: number,
  scoreBuckets?: ScoreBucket[]
): string {
  const vorname = variables.vorname ?? "";
  const bucket = resolveBucket(score, scoreBuckets);
  const bucketReversed = bucket ? [...bucket.id].reverse().join("") : "";
  return `${vorname}${MESSE_QR_SEPARATOR}${bucketReversed}${MESSE_QR_SEPARATOR}`;
}

function SimulatorQrCode({
  mode,
  templateContent,
  caption,
  scoreBuckets,
}: {
  caption?: string;
  mode: "template" | "session-data" | "messe";
  scoreBuckets?: ScoreBucket[];
  templateContent?: string;
}) {
  const session = useSimulatorStore((s) => s.session);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  let qrContent = templateContent || "";
  let rawDisplay = qrContent;
  if (mode === "session-data" && session) {
    const { json, base64 } = buildSessionDataJson(
      session.variables,
      session.score,
      scoreBuckets
    );
    qrContent = base64;
    rawDisplay = `${base64}\n\n— decoded —\n${json}`;
  } else if (mode === "messe" && session) {
    qrContent = buildMesseQr(session.variables, session.score, scoreBuckets);
    rawDisplay = qrContent;
  }

  useEffect(() => {
    if (!qrContent) {
      return;
    }
    // Dynamic import to avoid SSR issues with canvas-based qrcode
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(qrContent, { width: 200, margin: 2 }).then(
        (url: string) => setDataUrl(url)
      );
    });
  }, [qrContent]);

  return (
    <div className="mt-2">
      <div className="relative inline-block">
        {dataUrl ? (
          <Image
            alt="QR Code"
            className="rounded-lg"
            height={200}
            src={dataUrl}
            unoptimized
            width={200}
          />
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border-2 border-gray-300 border-dashed bg-gray-50 text-gray-400 text-xs">
            Generiere QR...
          </div>
        )}

        {/* Raw data popup trigger */}
        {qrContent && (
          <Button
            className="absolute top-1 right-1 opacity-70 hover:opacity-100"
            onClick={() => setShowRaw(true)}
            size="icon-xs"
            title="Rohdaten anzeigen"
            type="button"
            variant="secondary"
          >
            <Code className="size-2.5" />
          </Button>
        )}
      </div>

      {caption && <p className="mt-1 text-gray-500 text-xs">{caption}</p>}

      {mode === "session-data" && (
        <Badge className="mt-1 text-[0.6rem]" variant="outline">
          Session-Daten
        </Badge>
      )}

      {mode === "messe" && (
        <Badge className="mt-1 text-[0.6rem]" variant="outline">
          Messe
        </Badge>
      )}

      <Dialog onOpenChange={setShowRaw} open={showRaw}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">QR-Code Rohdaten</DialogTitle>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {rawDisplay}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
