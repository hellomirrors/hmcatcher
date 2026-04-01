"use server";

import { revalidatePath } from "next/cache";
import type { Settings } from "@/domain/settings/settings-schema";
import {
  readSettings,
  writeSettings,
} from "@/domain/settings/settings-service";

export interface SettingsActionState {
  error?: string;
  settings?: Settings;
  success: boolean;
}

export interface EnvVarInfo {
  maskedValue: string;
  name: string;
  set: boolean;
}

export interface EnvVarGroup {
  label: string;
  vars: EnvVarInfo[];
}

function maskValue(value: string | undefined): string {
  if (!value) {
    return "";
  }
  if (value.length <= 6) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 3)}${"*".repeat(value.length - 6)}${value.slice(-3)}`;
}

function envInfo(name: string): EnvVarInfo {
  const value = process.env[name];
  return { name, set: !!value, maskedValue: maskValue(value) };
}

export async function getSettingsAction(): Promise<Settings> {
  return await readSettings();
}

export async function getEnvStatus(): Promise<EnvVarGroup[]> {
  return await Promise.resolve([
    {
      label: "GoWA (go-whatsapp-web)",
      vars: [
        envInfo("GOWA_BASE_URL"),
        envInfo("GOWA_USERNAME"),
        envInfo("GOWA_PASSWORD"),
        envInfo("GOWA_WEBHOOK_SECRET"),
        envInfo("GOWA_PHONE_NUMBER"),
      ],
    },
    {
      label: "WhatsApp (Meta Cloud API)",
      vars: [
        envInfo("WHATSAPP_ACCESS_TOKEN"),
        envInfo("WHATSAPP_PHONE_NUMBER_ID"),
        envInfo("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
      ],
    },
    {
      label: "Telegram",
      vars: [envInfo("TELEGRAM_BOT_TOKEN"), envInfo("TELEGRAM_BOT_USERNAME")],
    },
    {
      label: "Allgemein",
      vars: [envInfo("MESSAGING_PROVIDER"), envInfo("SETTINGS_DIR")],
    },
  ]);
}

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const whatsappProvider = formData.get("whatsappProvider") as string;
    const settings = await writeSettings({
      whatsappProvider: whatsappProvider as Settings["whatsappProvider"],
    });
    revalidatePath("/settings");
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
