"use client";

import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { ChatArea } from "./chat-area";
import { ChatInput } from "./chat-input";
import { SessionPanel } from "./session-panel";

interface DialogSimulatorProps {
  definition: DialogDefinition;
}

export function DialogSimulator({ definition }: DialogSimulatorProps) {
  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Chat area — left */}
      <div className="flex flex-1 flex-col rounded-xl bg-[#ECE5DD]">
        <ChatArea definition={definition} />
        <ChatInput definition={definition} />
      </div>

      {/* Session panel — right */}
      <div className="w-72 shrink-0">
        <SessionPanel />
      </div>
    </div>
  );
}
