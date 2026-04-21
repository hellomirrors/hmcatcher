"use client";

type AudioCtor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;

function getAudioCtxCtor(): AudioCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as Window &
    typeof globalThis & { webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function getAudioContext(): AudioContext | null {
  if (sharedCtx) {
    return sharedCtx;
  }
  const Ctor = getAudioCtxCtor();
  if (!Ctor) {
    return null;
  }
  sharedCtx = new Ctor();
  return sharedCtx;
}

export function primeAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // browser blocked resume — ignore
    });
  }
}

type OscType = "sine" | "square" | "triangle" | "sawtooth";

interface EnvToneOpts {
  delay?: number;
  dur?: number;
  freq: number;
  gain?: number;
  slideTo?: number | null;
  type?: OscType;
}

function envTone({
  freq,
  dur = 0.18,
  type = "sine",
  gain = 0.18,
  slideTo = null,
  delay = 0,
}: EnvToneOpts): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") {
    return;
  }
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface NoiseBurstOpts {
  delay?: number;
  dur?: number;
  gain?: number;
  hp?: number;
}

function noiseBurst({
  dur = 0.2,
  gain = 0.12,
  delay = 0,
  hp = 600,
}: NoiseBurstOpts): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") {
    return;
  }
  const t0 = ctx.currentTime + delay;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/**
 * Short (~1s) triumphant fanfare — C major arpeggio with shimmer.
 * Ported from hmexhibitions/hmslots/src/utils/audio.ts (`playWinJingle`).
 * Suitable for repeated notifications (new lead arrived).
 */
export function playWinJingle(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") {
    return;
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const notes = [
    { freq: 523.25, start: 0, dur: 0.12 },
    { freq: 659.25, start: 0.1, dur: 0.12 },
    { freq: 783.99, start: 0.2, dur: 0.12 },
    { freq: 1046.5, start: 0.3, dur: 0.3 },
    { freq: 783.99, start: 0.55, dur: 0.1 },
    { freq: 1046.5, start: 0.65, dur: 0.45 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);
    gain.gain.setValueAtTime(0, ctx.currentTime + note.start);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + note.start + 0.02);
    gain.gain.setValueAtTime(
      0.3,
      ctx.currentTime + note.start + note.dur * 0.6
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + note.start + note.dur
    );
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + note.start);
    osc.stop(ctx.currentTime + note.start + note.dur + 0.01);
  }

  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const t = 0.3 + i * 0.08;
    osc.frequency.setValueAtTime(2093 + i * 200, ctx.currentTime + t);
    gain.gain.setValueAtTime(0, ctx.currentTime + t);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.16);
  }
}

/** Cheerful candy-win melody (~1s). */
export function playCandyWin(): void {
  const mel = [659, 784, 988, 1319, 1568, 1319, 1760];
  for (const [i, f] of mel.entries()) {
    envTone({
      freq: f,
      dur: 0.22,
      type: "triangle",
      gain: 0.14,
      delay: i * 0.09,
    });
  }
  const sparkle = [2093, 2637, 3136];
  for (const [i, f] of sparkle.entries()) {
    envTone({
      freq: f,
      dur: 0.14,
      type: "sine",
      gain: 0.08,
      delay: 0.65 + i * 0.07,
    });
  }
  envTone({ freq: 1319, dur: 1.2, type: "sine", gain: 0.08, delay: 0.7 });
  envTone({ freq: 1760, dur: 1.2, type: "sine", gain: 0.06, delay: 0.75 });
  noiseBurst({ dur: 0.25, gain: 0.04, hp: 4000, delay: 0.2 });
}

/** Drink-win arpeggio + sparkle (~1.5s). */
export function playDrinkWin(): void {
  const arp = [392, 523, 659, 784, 988, 1175, 1568];
  for (const [i, f] of arp.entries()) {
    envTone({
      freq: f,
      dur: 0.24,
      type: "triangle",
      gain: 0.14,
      delay: i * 0.1,
    });
  }
  for (let i = 0; i < 18; i++) {
    envTone({
      freq: 2400 + Math.random() * 2000,
      dur: 0.05,
      type: "sine",
      gain: 0.045,
      delay: 0.7 + i * 0.05,
    });
  }
  noiseBurst({ dur: 0.8, gain: 0.04, hp: 3500, delay: 0.7 });
  envTone({ freq: 261, dur: 1.6, type: "sawtooth", gain: 0.06, delay: 0.4 });
  envTone({ freq: 392, dur: 1.6, type: "sine", gain: 0.07, delay: 0.4 });
  envTone({ freq: 523, dur: 1.6, type: "sine", gain: 0.06, delay: 0.4 });
  envTone({ freq: 1568, dur: 0.9, type: "sine", gain: 0.11, delay: 1.0 });
}

/** Full 5s jackpot fanfare with multiple layers. Heavy — avoid rapid replay. */
export function playJackpotWin(): void {
  envTone({
    freq: 180,
    slideTo: 880,
    dur: 0.55,
    type: "sawtooth",
    gain: 0.14,
    delay: 0,
  });
  noiseBurst({ dur: 0.55, gain: 0.08, hp: 800, delay: 0 });
  noiseBurst({ dur: 0.9, gain: 0.16, hp: 4000, delay: 0.5 });
  noiseBurst({ dur: 1.4, gain: 0.06, hp: 2000, delay: 0.5 });
  const mel = [523, 659, 784, 1047, 1319, 1047, 1319, 1568, 2093];
  for (const [i, f] of mel.entries()) {
    envTone({
      freq: f,
      dur: 0.32,
      type: "square",
      gain: 0.13,
      delay: 0.6 + i * 0.13,
    });
    envTone({
      freq: f * 0.75,
      dur: 0.32,
      type: "sawtooth",
      gain: 0.08,
      delay: 0.6 + i * 0.13,
    });
  }
  const chord = [523, 659, 784, 1047, 1319];
  for (const f of chord) {
    envTone({ freq: f, dur: 2.6, type: "sawtooth", gain: 0.055, delay: 1.9 });
    envTone({
      freq: f * 1.01,
      dur: 2.6,
      type: "sawtooth",
      gain: 0.04,
      delay: 1.9,
    });
    envTone({ freq: f * 0.5, dur: 2.6, type: "sine", gain: 0.05, delay: 1.9 });
  }
  envTone({
    freq: 110,
    slideTo: 55,
    dur: 2.4,
    type: "sine",
    gain: 0.28,
    delay: 1.9,
  });
  envTone({
    freq: 55,
    slideTo: 40,
    dur: 2.4,
    type: "triangle",
    gain: 0.18,
    delay: 1.9,
  });
  for (let i = 0; i < 32; i++) {
    const base = 1800 + Math.random() * 2200;
    envTone({
      freq: base,
      dur: 0.09,
      type: "sine",
      gain: 0.08,
      delay: 1.3 + i * 0.06,
    });
    envTone({
      freq: base * 2,
      dur: 0.06,
      type: "triangle",
      gain: 0.05,
      delay: 1.3 + i * 0.06,
    });
  }
  for (let i = 0; i < 14; i++) {
    envTone({
      freq: 2000 + Math.random() * 2500,
      dur: 0.12,
      type: "sine",
      gain: 0.06,
      delay: 2.4 + i * 0.11,
    });
  }
  noiseBurst({ dur: 2.2, gain: 0.05, hp: 500, delay: 1.3 });
  noiseBurst({ dur: 2.0, gain: 0.03, hp: 2000, delay: 2.0 });
  envTone({ freq: 1047, dur: 0.7, type: "square", gain: 0.14, delay: 3.8 });
  envTone({ freq: 1319, dur: 0.7, type: "square", gain: 0.14, delay: 3.8 });
  envTone({ freq: 1568, dur: 0.7, type: "square", gain: 0.14, delay: 3.8 });
  envTone({ freq: 2093, dur: 1.1, type: "sawtooth", gain: 0.1, delay: 3.8 });
  envTone({ freq: 82, dur: 1.1, type: "sine", gain: 0.22, delay: 3.8 });
}
