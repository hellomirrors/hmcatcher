"use client";

export const BotAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00B896] font-semibold text-sm text-white">
    F
  </div>
);

export const BotBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <BotAvatar />
    <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
      {children}
    </div>
  </div>
);

export const UserBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] rounded-lg rounded-br-none bg-[#DCF8C6] px-3 py-2 shadow-sm">
      {children}
    </div>
  </div>
);

export const ButtonPill = ({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) => (
  <button
    className={`w-full rounded-full border border-[#00B896] px-4 py-1.5 text-center text-sm transition-colors ${
      disabled
        ? "cursor-default opacity-40"
        : "cursor-pointer text-[#00B896] hover:bg-[#00B896]/10"
    }`}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
);

export const QrPlaceholder = () => (
  <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-gray-300 border-dashed bg-gray-50">
    <svg
      aria-label="QR-Code Platzhalter"
      className="h-12 w-12 text-gray-400"
      fill="none"
      role="img"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm14 3h.01M17 17h.01M14 14h3v3h-3v-3zm3 3h3v3h-3v-3z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  </div>
);

export const VideoPlaceholder = ({ url }: { url?: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
    <svg
      aria-label="Video Platzhalter"
      className="h-8 w-8 shrink-0 text-gray-400"
      fill="none"
      role="img"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
    <span className="truncate text-gray-500 text-sm">
      {url ?? "Video-Link"}
    </span>
  </div>
);

export const SystemBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-center">
    <div className="rounded-lg bg-white/80 px-3 py-1.5 text-center text-gray-500 text-xs shadow-sm">
      {children}
    </div>
  </div>
);
