/**
 * CSRF-style Origin checks for same-origin POST JSON behind Nginx → Node.
 * Uses Host + (production) X-Forwarded-* only when Host is loopback/missing.
 */

import { PUBLIC_SITE_ORIGIN } from "@/lib/registration/flows/public-url";
import { GUIDANCE_PUBLIC_HOST } from "@/lib/guidance/canonical-entry";

export const MUTATION_ORIGIN_FORBIDDEN_MESSAGE_FA =
  "نشانی ارسال درخواست معتبر شناخته نشد. صفحه را تازه‌سازی کنید؛ اگر مشکل ادامه داشت با مدیر سامانه تماس بگیرید.";

const DEFAULT_TRUSTED_HOSTS = [
  "setareganplus.ir",
  "www.setareganplus.ir",
  GUIDANCE_PUBLIC_HOST,
  "moshaver.setareganplus.ir",
  "shop.setareganplus.ir",
  "team.setareganplus.ir",
] as const;

export type MutationOriginCheck =
  | { ok: true; requestHost: string; originHost: string }
  | { ok: false; reason: string; requestHost?: string; originHost?: string };

function normalizeHostname(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    if (trimmed.includes("://")) {
      return normalizeHostname(new URL(trimmed).host);
    }
  } catch {
    // fall through
  }
  const host = trimmed.split(",")[0]?.trim() ?? "";
  if (host.startsWith("[") && host.includes("]")) {
    const inner = host.slice(1, host.indexOf("]"));
    return inner;
  }
  if (host.endsWith(":443") || host.endsWith(":80")) {
    return host.replace(/:(443|80)$/, "");
  }
  return host.split(":")[0] ?? host;
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function hostnameFromConfiguredOrigin(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    return normalizeHostname(new URL(v.includes("://") ? v : `https://${v}`).host);
  } catch {
    return normalizeHostname(v);
  }
}

let cachedTrusted: Set<string> | null = null;

export function getTrustedAppHostnames(): Set<string> {
  if (cachedTrusted) return cachedTrusted;
  const set = new Set<string>();
  for (const h of DEFAULT_TRUSTED_HOSTS) {
    set.add(normalizeHostname(h));
  }
  set.add(normalizeHostname(new URL(PUBLIC_SITE_ORIGIN).host));

  const fromEnv = process.env.TRUSTED_APP_HOSTS?.split(",") ?? [];
  for (const entry of fromEnv) {
    const h = normalizeHostname(entry);
    if (h) set.add(h);
  }
  for (const key of ["COUNSELOR_OS_HOST", "GUIDANCE_SELECTION_HOST", "NEXT_PUBLIC_APP_HOST"]) {
    const h = hostnameFromConfiguredOrigin(process.env[key]);
    if (h) set.add(h);
  }
  cachedTrusted = set;
  return set;
}

/** Reset cache for tests. */
export function resetTrustedAppHostnamesCacheForTests(): void {
  cachedTrusted = null;
}

function hostsEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  const pair = new Set([a, b]);
  if (pair.has("setareganplus.ir") && pair.has("www.setareganplus.ir")) {
    return true;
  }
  return false;
}

export function resolvePublicRequestHost(request: Request): string {
  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const fromHost = normalizeHostname(hostHeader);
    if (fromHost && !isLoopbackHost(fromHost)) {
      return fromHost;
    }
  }

  if (process.env.NODE_ENV === "production") {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const candidate = normalizeHostname(forwardedHost);
      if (candidate && getTrustedAppHostnames().has(candidate)) {
        const directHost = hostHeader ? normalizeHostname(hostHeader) : "";
        if (directHost && !isLoopbackHost(directHost) && directHost !== candidate) {
          return directHost;
        }
        return candidate;
      }
    }
  }

  try {
    return normalizeHostname(new URL(request.url).host);
  } catch {
    return "";
  }
}

function resolveSourceOriginHost(request: Request): { host: string | null; reason?: string } {
  const origin = request.headers.get("origin");
  if (origin) {
    if (origin === "null") return { host: null, reason: "null_origin" };
    try {
      return { host: normalizeHostname(new URL(origin).host) };
    } catch {
      return { host: null, reason: "bad_origin" };
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return { host: normalizeHostname(new URL(referer).host) };
    } catch {
      return { host: null, reason: "bad_referer" };
    }
  }
  return { host: null, reason: "missing_origin" };
}

function resolveSourceOriginProtocol(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") {
    try {
      return new URL(origin).protocol;
    } catch {
      return null;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).protocol;
    } catch {
      return null;
    }
  }
  return null;
}

export function validateTrustedMutationOrigin(request: Request): MutationOriginCheck {
  const trusted = getTrustedAppHostnames();
  const requestHost = resolvePublicRequestHost(request);
  const source = resolveSourceOriginHost(request);

  if (!source.host) {
    return { ok: false, reason: source.reason ?? "missing_origin", requestHost };
  }

  const originHost = source.host;
  const protocol = resolveSourceOriginProtocol(request);

  if (
    process.env.NODE_ENV !== "production" &&
    isLoopbackHost(originHost) &&
    (isLoopbackHost(requestHost) || !requestHost)
  ) {
    return { ok: true, requestHost: requestHost || originHost, originHost };
  }

  if (process.env.NODE_ENV === "production" && isLoopbackHost(requestHost) && !isLoopbackHost(originHost)) {
    return { ok: false, reason: "missing_public_host", requestHost, originHost };
  }

  if (process.env.NODE_ENV === "production") {
    if (protocol !== "https:") {
      return { ok: false, reason: "insecure_origin", requestHost, originHost };
    }
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (forwardedProto && forwardedProto !== "https" && !isLoopbackHost(requestHost)) {
      return { ok: false, reason: "insecure_forwarded_proto", requestHost, originHost };
    }
  }

  if (!trusted.has(originHost)) {
    return { ok: false, reason: "untrusted_origin", requestHost, originHost };
  }

  if (requestHost && !isLoopbackHost(requestHost) && !trusted.has(requestHost)) {
    return { ok: false, reason: "untrusted_request_host", requestHost, originHost };
  }

  if (
    requestHost &&
    !isLoopbackHost(requestHost) &&
    !hostsEquivalent(originHost, requestHost)
  ) {
    return { ok: false, reason: "origin_host_mismatch", requestHost, originHost };
  }

  return { ok: true, requestHost, originHost };
}

export function refererOriginForLog(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function requestUrlOriginForLog(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}
