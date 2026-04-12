"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { ChatMessage } from "./chat-message";
import { useSimulatorStore } from "./simulator-store";

interface ChatAreaProps {
  definition: DialogDefinition;
}

export function ChatArea({ definition }: ChatAreaProps) {
  const messages = useSimulatorStore((s) => s.messages);
  const sendMessage = useSimulatorStore((s) => s.sendMessage);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Find the last bot message index for enabling interactive buttons
  let lastBotIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === "bot") {
      lastBotIndex = i;
      break;
    }
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-3 p-4">
        {messages.map((msg, i) => (
          <ChatMessage
            isLatestBotMessage={i === lastBotIndex}
            key={msg.id}
            message={msg}
            onSelectOption={(label) => sendMessage(definition, label)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
