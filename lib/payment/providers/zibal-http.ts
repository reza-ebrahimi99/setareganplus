/**
 * Zibal IPG HTTP helpers — server-only.
 * Never log merchant credentials.
 * Gateway origin is fixed to https://gateway.zibal.ir (no env override).
 */

import { ZIBAL_GATEWAY_ORIGIN } from "@/lib/payment/payment-guards";

export const ZIBAL_GATEWAY_BASE = ZIBAL_GATEWAY_ORIGIN;

export function getZibalGatewayBase(): string {
  return ZIBAL_GATEWAY_ORIGIN;
}

export function getZibalTimeoutMs(): number {
  const raw = process.env.ZIBAL_TIMEOUT_MS?.trim();
  if (!raw) return 10_000;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : 10_000;
}

export function readZibalMerchantId(): string | null {
  const merchant = process.env.ZIBAL_MERCHANT_ID?.trim();
  return merchant && merchant.length > 0 ? merchant : null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type ZibalHttpResult =
  | { ok: true; status: number; json: Record<string, unknown> }
  | { ok: false; error: string; status?: number };

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

let fetchForTests: FetchLike | null = null;

/** Test hook — never use in production paths. */
export function setZibalFetchForTests(fetchImpl: FetchLike | null): void {
  fetchForTests = fetchImpl;
}

/**
 * POST JSON to Zibal with timeout. Does not log merchant secrets.
 */
export async function postZibalJson(
  path: string,
  body: Record<string, unknown>,
): Promise<ZibalHttpResult> {
  const base = getZibalGatewayBase();
  const url = `${base}/${path.replace(/^\/+/, "")}`;
  const controller = new AbortController();
  const timeoutMs = getZibalTimeoutMs();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = fetchForTests ?? globalThis.fetch.bind(globalThis);

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return {
        ok: false,
        error: "پاسخ درگاه زیبال قابل‌خواندن نیست.",
        status: response.status,
      };
    }

    const json = asRecord(parsed);
    if (!json) {
      return {
        ok: false,
        error: "ساختار پاسخ درگاه زیبال نامعتبر است.",
        status: response.status,
      };
    }

    return { ok: true, status: response.status, json };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "زمان انتظار ارتباط با درگاه زیبال به پایان رسید.",
      };
    }
    return { ok: false, error: "ارتباط با درگاه زیبال برقرار نشد." };
  } finally {
    clearTimeout(timer);
  }
}

export function zibalStartUrl(trackId: string | number): string {
  return `${ZIBAL_GATEWAY_ORIGIN}/start/${encodeURIComponent(String(trackId))}`;
}
