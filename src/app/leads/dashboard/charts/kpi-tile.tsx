import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  accent?: "primary" | "success" | "warn" | "muted";
  delta?: number;
  hint?: string;
  icon?: ReactNode;
  label: string;
  value: string;
}

const accentClasses: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  primary: "text-primary",
  success: "text-emerald-500",
  warn: "text-amber-500",
  muted: "text-muted-foreground",
};

function formatDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return String(delta);
}

export function KpiTile({
  label,
  value,
  hint,
  delta,
  icon,
  accent = "primary",
}: KpiTileProps) {
  return (
    <Card aria-live="polite">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {label}
          </p>
          <p className={cn("font-semibold text-3xl", accentClasses[accent])}>
            {value}
          </p>
          {(hint || delta !== undefined) && (
            <p className="text-muted-foreground text-xs">
              {delta !== undefined && delta !== 0 ? (
                <span
                  className={cn(
                    "mr-2 font-medium",
                    delta > 0 ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {formatDelta(delta)}
                </span>
              ) : null}
              {hint}
            </p>
          )}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  );
}
