"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RevealLinkProps {
  href: string;
}

export function RevealLink({ href }: RevealLinkProps) {
  const [shown, setShown] = useState(false);

  if (!shown) {
    return (
      <Button
        onClick={() => setShown(true)}
        size="xs"
        type="button"
        variant="ghost"
      >
        <Eye className="mr-1 size-3" />
        Link anzeigen
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <a
        className="break-all text-primary text-xs hover:underline"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {href}
      </a>
      <Button
        onClick={() => setShown(false)}
        size="icon-xs"
        title="Link verbergen"
        type="button"
        variant="ghost"
      >
        <EyeOff className="size-3" />
      </Button>
    </div>
  );
}
