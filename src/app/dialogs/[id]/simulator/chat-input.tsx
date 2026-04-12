"use client";

import { Play, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { useSimulatorStore } from "./simulator-store";

interface ChatInputProps {
  definition: DialogDefinition;
}

export function ChatInput({ definition }: ChatInputProps) {
  const status = useSimulatorStore((s) => s.status);
  const start = useSimulatorStore((s) => s.start);
  const sendMessage = useSimulatorStore((s) => s.sendMessage);
  const [text, setText] = useState("");

  if (status === "idle") {
    return (
      <div className="flex justify-center border-t bg-white/80 p-4">
        <Button onClick={() => start(definition)} size="lg">
          <Play className="mr-2 size-4" />
          Simulation starten
        </Button>
      </div>
    );
  }

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    sendMessage(definition, trimmed);
    setText("");
  };

  return (
    <div className="flex items-center gap-2 border-t bg-white/80 px-4 py-3">
      <Input
        disabled={status === "completed"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={
          status === "completed"
            ? "Dialog abgeschlossen"
            : "Nachricht eingeben..."
        }
        value={text}
      />
      <Button
        disabled={status === "completed" || !text.trim()}
        onClick={handleSend}
        size="icon"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
