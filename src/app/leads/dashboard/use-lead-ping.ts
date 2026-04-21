"use client";

import { useEffect, useRef } from "react";
import { playWinJingle } from "./win-audio";

/**
 * Plays a short win fanfare when `latestLeadId` increases. The initial
 * value is captured silently so the hook does not beep on first mount.
 */
export function useLeadPing(latestLeadId: number | null, muted: boolean): void {
  const lastSeenRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSeenRef.current = latestLeadId;
      return;
    }
    if (latestLeadId === null) {
      return;
    }
    const lastSeen = lastSeenRef.current ?? 0;
    if (latestLeadId > lastSeen) {
      lastSeenRef.current = latestLeadId;
      if (!muted) {
        playWinJingle();
      }
    }
  }, [latestLeadId, muted]);
}
