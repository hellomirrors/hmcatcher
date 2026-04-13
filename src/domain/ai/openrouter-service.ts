import { resolveSettings } from "@/domain/settings/settings-service";
import { createLogger } from "@/lib/logger";

const log = createLogger("openrouter");

export interface AiMessage {
  content: string;
  role: "system" | "user" | "assistant";
}

export interface AiResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

/**
 * Call an OpenRouter model with the configured API key and model.
 *
 * Use this from server-side code (API routes, server actions, server
 * components). The API key is read from settings, so it never reaches
 * the client.
 */
export async function callAI(
  messages: AiMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<AiResponse> {
  const cfg = await resolveSettings();

  if (!cfg.openrouterApiKey) {
    throw new Error("OpenRouter API Key ist nicht konfiguriert (Settings)");
  }
  if (!cfg.openrouterModel) {
    throw new Error("OpenRouter Modell ist nicht konfiguriert (Settings)");
  }

  log.info("Calling OpenRouter", {
    model: cfg.openrouterModel,
    messageCount: messages.length,
  });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.openrouterApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.openrouterModel,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    log.error("OpenRouter API error", undefined, {
      status: res.status,
      body: text.slice(0, 500),
    });
    throw new Error(
      `OpenRouter API error (${res.status}): ${text.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty response");
  }

  log.info("OpenRouter response", {
    model: data.model,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  });

  return {
    content,
    model: data.model,
    usage: data.usage,
  };
}
