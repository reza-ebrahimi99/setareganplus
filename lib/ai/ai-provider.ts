/**
 * AI provider abstraction.
 * Default: disabled / deterministic fallback (no external SDK).
 *
 * Env (optional, never commit secrets):
 *   STAROS_AI_ENABLED=true
 *   STAROS_AI_PROVIDER=none|http
 *   STAROS_AI_ENDPOINT=
 *   STAROS_AI_API_KEY=
 *   STAROS_AI_TIMEOUT_MS=4000
 */

import type { AiProvider, AiProviderRequest, AiProviderResponse } from "@/lib/ai/types";

function readEnabled(): boolean {
  return process.env.STAROS_AI_ENABLED === "true";
}

function readTimeoutMs(fallback: number): number {
  const raw = Number(process.env.STAROS_AI_TIMEOUT_MS ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 20_000) : fallback;
}

/**
 * No-op provider — always unavailable. Safe default for production until wired.
 */
export class NullAiProvider implements AiProvider {
  readonly name = "null";

  isEnabled(): boolean {
    return false;
  }

  async complete(_request: AiProviderRequest): Promise<AiProviderResponse> {
    return { ok: false, reason: "disabled" };
  }
}

/**
 * Optional HTTP provider skeleton. Does not invent slots; only returns model text.
 * Not used unless STAROS_AI_PROVIDER=http and endpoint/key are set.
 */
export class HttpAiProvider implements AiProvider {
  readonly name = "http";

  isEnabled(): boolean {
    return (
      readEnabled() &&
      process.env.STAROS_AI_PROVIDER === "http" &&
      Boolean(process.env.STAROS_AI_ENDPOINT?.trim()) &&
      Boolean(process.env.STAROS_AI_API_KEY?.trim())
    );
  }

  async complete(request: AiProviderRequest): Promise<AiProviderResponse> {
    if (!this.isEnabled()) {
      return { ok: false, reason: "disabled" };
    }

    const endpoint = process.env.STAROS_AI_ENDPOINT!.trim();
    const apiKey = process.env.STAROS_AI_API_KEY!.trim();
    const timeoutMs = request.timeoutMs ?? readTimeoutMs(4000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          feature: request.feature,
          locale: request.locale,
          context: request.context,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return { ok: false, reason: "unavailable" };
      }

      const data = (await response.json()) as { text?: unknown };
      if (typeof data.text !== "string" || !data.text.trim()) {
        return { ok: false, reason: "invalid" };
      }

      return { ok: true, text: data.text.trim() };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, reason: "timeout" };
      }
      return { ok: false, reason: "unavailable" };
    } finally {
      clearTimeout(timer);
    }
  }
}

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;
  if (process.env.STAROS_AI_PROVIDER === "http") {
    cached = new HttpAiProvider();
  } else {
    cached = new NullAiProvider();
  }
  return cached;
}

/** Test helper */
export function resetAiProviderCache(): void {
  cached = null;
}
