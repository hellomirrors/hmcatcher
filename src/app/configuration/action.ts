"use server";

import { revalidatePath } from "next/cache";
import { conversationConfigSchema } from "@/domain/configuration/configuration-schema";
import {
  readConfiguration,
  writeConfiguration,
} from "@/domain/configuration/configuration-service";

export interface ConfigActionState {
  error?: string;
  success: boolean;
}

export async function saveConfigurationAction(
  _prev: ConfigActionState,
  formData: FormData
): Promise<ConfigActionState> {
  try {
    const json = formData.get("config") as string;
    const parsed = JSON.parse(json);
    const config = conversationConfigSchema.parse(parsed);
    await writeConfiguration(config);
    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function exportConfigurationAction(): Promise<string> {
  const config = await readConfiguration();
  return JSON.stringify(config, null, 2);
}

export async function resetConfigurationAction(
  _prev: ConfigActionState
): Promise<ConfigActionState> {
  try {
    const defaults = conversationConfigSchema.parse({});
    await writeConfiguration(defaults);
    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
