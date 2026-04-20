"use server";

import { revalidatePath } from "next/cache";
import type { Settings } from "@/domain/settings/settings-schema";
import {
  readSettings,
  writeSettings,
} from "@/domain/settings/settings-service";
import {
  ENV_FALLBACKS,
  type EnvFallbackInfo,
  type SettingsActionState,
  STRING_FIELDS,
} from "./constants";

export async function getSettingsAction(): Promise<Settings> {
  return await readSettings();
}

export async function getEnvFallbacks(): Promise<EnvFallbackInfo[]> {
  await readSettings();
  return Object.entries(ENV_FALLBACKS).map(([key, envName]) => ({
    key,
    envName,
    hasEnv: !!process.env[envName],
  }));
}

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const patch: Partial<Settings> = {
      whatsappProvider: formData.get(
        "whatsappProvider"
      ) as Settings["whatsappProvider"],
      whatsappPhoneMode: formData.get(
        "whatsappPhoneMode"
      ) as Settings["whatsappPhoneMode"],
      showTelegramQr: formData.get("showTelegramQr") === "on",
    };

    for (const field of STRING_FIELDS) {
      const value = formData.get(field);
      patch[field] =
        typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    const settings = await writeSettings(patch);
    revalidatePath("/settings");
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
