"use client";

import { usePathname } from "next/navigation";
import { AtrinAssistant } from "@/components/atrin";
import { AiErrorBoundary } from "@/components/ai/AiErrorBoundary";

const HIDDEN_PREFIXES = ["/admin", "/portal", "/staff", "/atrin"] as const;

function shouldHideAssistant(pathname: string | null): boolean {
  if (!pathname) return true;
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
