import type { ResolvedSettings } from "@/domain/settings/settings-schema";

export interface ProviderStatus {
  configured: boolean;
  id: string;
  label: string;
  missingVars: string[];
}

export function getProviderStatuses(cfg: ResolvedSettings): ProviderStatus[] {
  return [
    {
      id: "telegram",
      label: "Telegram",
      configured: !!cfg.telegramBotToken,
      missingVars: [...(cfg.telegramBotToken ? [] : ["telegramBotToken"])],
    },
    {
      id: "whatsapp",
      label: "WhatsApp (Meta Cloud API)",
      configured: !!cfg.whatsappAccessToken && !!cfg.whatsappPhoneNumberId,
      missingVars: [
        ...(cfg.whatsappAccessToken ? [] : ["whatsappAccessToken"]),
        ...(cfg.whatsappPhoneNumberId ? [] : ["whatsappPhoneNumberId"]),
      ],
    },
    {
      id: "gowa",
      label: "GoWA (go-whatsapp-web)",
      configured:
        !!cfg.gowaBaseUrl &&
        !!cfg.gowaUsername &&
        !!cfg.gowaPassword &&
        !!cfg.gowaDeviceId,
      missingVars: [
        ...(cfg.gowaBaseUrl ? [] : ["gowaBaseUrl"]),
        ...(cfg.gowaUsername ? [] : ["gowaUsername"]),
        ...(cfg.gowaPassword ? [] : ["gowaPassword"]),
        ...(cfg.gowaDeviceId ? [] : ["gowaDeviceId"]),
      ],
    },
  ];
}
