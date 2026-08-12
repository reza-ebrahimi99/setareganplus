"use client";

import { usePathname } from "next/navigation";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { AiErrorBoundary } from "@/components/ai/AiErrorBoundary";

const HIDDEN_PREFIXES = ["/admin", "/portal", "/staff"] as const;

function shouldHideAssistant(pathname: string | null): boolean {
  if (!pathname) return true;
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Public-only host for StarOS AI Assistant.
 * Hidden on admin, portal, and staff routes.
 */
export function AiAssistantHost() {
  const pathname = usePathname();

  if (shouldHideAssistant(pathname)) {
    return null;
  }

  return (
    <AiErrorBoundary>
      <AiAssistant />
    </AiErrorBoundary>
  );
}
