"use client";

import { useEffect, useRef } from "react";

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as Window &
    typeof globalThis & { webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let sharedCtx: AudioContext | null = null;

function getSharedCtx(): AudioContext | null {
  if (sharedCtx) {
    return sharedCtx;
  }
  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    return null;
  }
  sharedCtx = new Ctor();
  return sharedCtx;
}

function playBeep(): void {
  const ctx = getSharedCtx();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // ignored — browser blocked resume
    });
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

/** Primes the shared AudioContext from a user gesture. */
export function primeAudio(): void {
  const ctx = getSharedCtx();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // ignored
    });
  }
}

/**
 * Plays a short beep when `latestLeadId` increases. The initial value is
 * captured silently so the hook does not beep on first mount.
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
        playBeep();
      }
    }
  }, [latestLeadId, muted]);
}
