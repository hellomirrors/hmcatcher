export interface ProviderStatus {
  configured: boolean;
  id: string;
  label: string;
  missingVars: string[];
}

export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      id: "telegram",
      label: "Telegram",
      configured: !!process.env.TELEGRAM_BOT_TOKEN,
      missingVars: [
        ...(process.env.TELEGRAM_BOT_TOKEN ? [] : ["TELEGRAM_BOT_TOKEN"]),
      ],
    },
    {
      id: "whatsapp",
      label: "WhatsApp (Meta Cloud API)",
      configured:
        !!process.env.WHATSAPP_ACCESS_TOKEN &&
        !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      missingVars: [
        ...(process.env.WHATSAPP_ACCESS_TOKEN ? [] : ["WHATSAPP_ACCESS_TOKEN"]),
        ...(process.env.WHATSAPP_PHONE_NUMBER_ID
          ? []
          : ["WHATSAPP_PHONE_NUMBER_ID"]),
      ],
    },
    {
      id: "gowa",
      label: "GoWA (go-whatsapp-web)",
      configured:
        !!process.env.GOWA_BASE_URL &&
        !!process.env.GOWA_USERNAME &&
        !!process.env.GOWA_PASSWORD &&
        !!process.env.GOWA_DEVICE_ID,
      missingVars: [
        ...(process.env.GOWA_BASE_URL ? [] : ["GOWA_BASE_URL"]),
        ...(process.env.GOWA_USERNAME ? [] : ["GOWA_USERNAME"]),
        ...(process.env.GOWA_PASSWORD ? [] : ["GOWA_PASSWORD"]),
        ...(process.env.GOWA_DEVICE_ID ? [] : ["GOWA_DEVICE_ID"]),
      ],
    },
  ];
}
