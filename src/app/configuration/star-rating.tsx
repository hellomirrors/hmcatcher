"use client";

import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STAR_TO_RELEVANCE } from "@/domain/configuration/configuration-schema";

export function StarRating({
  value,
  onChange,
}: {
  onChange: (stars: number) => void;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            className="p-0.5 transition-colors hover:text-yellow-400"
            key={star}
            onClick={() => onChange(star)}
            type="button"
          >
            <Star
              className={`size-4 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <Badge className="font-mono text-[10px]" variant="outline">
        {STAR_TO_RELEVANCE[value] ?? "—"}
      </Badge>
    </div>
  );
}
