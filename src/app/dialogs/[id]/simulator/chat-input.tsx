"use client";

import { Send, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DialogDefinition,
  DialogStep,
} from "@/domain/dialog/dialog-schema";
import { useSimulatorStore } from "./simulator-store";

interface ChatInputProps {
  definition: DialogDefinition;
}

const RANDOM_NAMES = [
  "Max",
  "Anna",
  "Lukas",
  "Lena",
  "Felix",
  "Mara",
  "Tim",
  "Lisa",
  "Jonas",
  "Sophie",
];

const RANDOM_LASTNAMES = [
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
];

const RANDOM_INSTITUTIONS = [
  "Seniorenresidenz Sonnenhof",
  "Pflegezentrum Am Park",
  "Haus Lindenblick",
  "Wohnstift Rosengarten",
  "Caritas-Haus St. Anna",
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) {
    return;
  }
  return arr[randInt(0, arr.length - 1)];
}

function generateForValidation(step: DialogStep): string {
  switch (step.validation) {
    case "email":
      return `test${randInt(100, 999)}@example.com`;
    case "phone":
      return `+4917${randInt(10_000_000, 99_999_999)}`;
    case "plz":
      return String(randInt(10_000, 99_999));
    case "number":
      return String(randInt(1, 1000));
    default: {
      const name = step.variableName ?? "";
      if (name.includes("nachname")) {
        return pickRandom(RANDOM_LASTNAMES) ?? "Mustermann";
      }
      if (name.includes("einrichtung") || name.includes("name")) {
        return pickRandom(RANDOM_INSTITUTIONS) ?? "Test-Einrichtung";
      }
      return pickRandom(RANDOM_NAMES) ?? "Test";
    }
  }
}

interface MagicInput {
  text: string;
  unsupported?: boolean;
}

function generateMagicInput(step: DialogStep | undefined): MagicInput {
  if (!step) {
    return { text: "", unsupported: true };
  }
  switch (step.type) {
    case "buttons":
    case "list": {
      const opt = pickRandom(step.options ?? []);
      if (!opt) {
        return { text: "", unsupported: true };
      }
      return { text: opt.label };
    }
    case "free_text":
      return { text: generateForValidation(step) };
    case "text":
    case "qr":
    case "video":
      return { text: "" };
    case "document":
      return { text: "weiter" };
    default:
      return { text: "", unsupported: true };
  }
}

export function ChatInput({ definition }: ChatInputProps) {
  const status = useSimulatorStore((s) => s.status);
  const sendMessage = useSimulatorStore((s) => s.sendMessage);
  const session = useSimulatorStore((s) => s.session);
  const [text, setText] = useState("");

  const currentStep = session
    ? definition.steps.find((s) => s.id === session.currentStepId)
    : undefined;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    sendMessage(definition, trimmed);
    setText("");
  };

  const handleMagic = () => {
    const magic = generateMagicInput(currentStep);
    if (magic.unsupported) {
      return;
    }
    sendMessage(definition, magic.text);
    setText("");
  };

  const magicDisabled =
    status !== "running" || generateMagicInput(currentStep).unsupported;

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
        disabled={magicDisabled}
        onClick={handleMagic}
        size="icon"
        title="Zufällige Antwort generieren"
        variant="outline"
      >
        <Wand2 className="size-4" />
      </Button>
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
