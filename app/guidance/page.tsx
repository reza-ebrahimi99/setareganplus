/**
 * Legacy public guidance landing (/guidance).
 *
 * Compatibility redirect only. The guidance product has exactly one public
 * URL now, so this route sends visitors to the canonical host instead of
 * rendering a second guidance homepage.
 */

import { permanentRedirect } from "next/navigation";
import { GUIDANCE_PUBLIC_ORIGIN } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function GuidanceLandingPage() {
  permanentRedirect(`${GUIDANCE_PUBLIC_ORIGIN}/`);
}
