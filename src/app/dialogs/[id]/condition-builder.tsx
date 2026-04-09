"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DialogCondition } from "@/domain/dialog/dialog-schema";

interface ConditionBuilderProps {
  conditions: DialogCondition[];
  onChange: (conditions: DialogCondition[]) => void;
  variableNames: string[];
}

const OPERATOR_LABELS: Record<DialogCondition["operator"], string> = {
  eq: "ist gleich",
  neq: "ist nicht gleich",
  in: "ist einer von",
  contains: "enthält",
  gt: "größer als",
  lt: "kleiner als",
};

const OPERATORS = Object.keys(OPERATOR_LABELS) as DialogCondition["operator"][];

export const ConditionBuilder = ({
  conditions,
  variableNames,
  onChange,
}: ConditionBuilderProps) => {
  const updateCondition = (index: number, update: Partial<DialogCondition>) => {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...update } : c)));
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    onChange([
      ...conditions,
      {
        field: variableNames[0] ?? "",
        operator: "eq",
        value: "",
      },
    ]);
  };

  return (
    <div className="grid gap-2">
      <Label className="text-muted-foreground text-xs">Bedingungen</Label>
      {conditions.map((condition, index) => (
        <div className="flex items-start gap-2" key={index}>
          <div className="grid flex-1 gap-1">
            <Select
              onValueChange={(val) =>
                updateCondition(index, { field: val as string })
              }
              value={condition.field}
            >
              <SelectTrigger>
                <SelectValue placeholder="Variable" />
              </SelectTrigger>
              <SelectContent>
                {variableNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Select
              onValueChange={(val) =>
                updateCondition(index, {
                  operator: val as DialogCondition["operator"],
                })
              }
              value={condition.operator}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid flex-1 gap-1">
            <Input
              onChange={(e) => {
                const raw = e.target.value;
                const newValue =
                  condition.operator === "in"
                    ? raw.split(",").map((s) => s.trim())
                    : raw;
                updateCondition(index, { value: newValue });
              }}
              placeholder={
                condition.operator === "in" ? "Werte (kommagetrennt)" : "Wert"
              }
              value={
                Array.isArray(condition.value)
                  ? condition.value.join(", ")
                  : String(condition.value)
              }
            />
          </div>
          <Button
            onClick={() => removeCondition(index)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        className="w-fit"
        onClick={addCondition}
        size="sm"
        type="button"
        variant="outline"
      >
        Bedingung hinzufügen
      </Button>
    </div>
  );
};
