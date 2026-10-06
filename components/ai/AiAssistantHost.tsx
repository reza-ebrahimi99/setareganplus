"use client";

import { usePathname } from "next/navigation";
import { AtrinAssistant } from "@/components/atrin/AtrinAssistant";
import { AiErrorBoundary } from "@/components/ai/AiErrorBoundary";

const HIDDEN_PREFIXES = [
  "/admin",
  "/portal",
  "/staff",
  "/atrin",
  "/guidance/pre-register",
  "/academy",
] as const;

function isAcademyPublicHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "academy.setareganplus.ir" ||
    host === "academy.localhost" ||
    host.startsWith("academy.")
  );
}

function shouldHideAssistant(pathname: string | null): boolean {
  // Only hide on known private/embed routes. Never hide when pathname is
  // temporarily unavailable (SSR/hydration) — that would unmount Atrin.
  if (!pathname) return false;
  if (isAcademyPublicHost()) return true;
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Public-only host for آترین (StarOS AI public face).
 * Hidden on admin, portal, staff, and /atrin (landing embeds chat).
 */
export function AiAssistantHost() {
  const pathname = usePathname();

  if (shouldHideAssistant(pathname)) {
    return null;
  }

  return (
    <AiErrorBoundary>
      <AtrinAssistant />
    </AiErrorBoundary>
  );
}
