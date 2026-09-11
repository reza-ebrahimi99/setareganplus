/**
 * Legacy 12-step journey route.
 *
 * Compatibility redirect only — this route must never render the legacy step
 * UI again. Everything goes through the canonical resolver, which resolves the
 * student's real Journey V2 currentStep.
 *
 * The legacy step components and server actions are deliberately left in the
 * tree; other code (admin history, shared forms) still imports them.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_JOURNEY_ENTRY } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function LegacyGuidanceJourneyStepPage() {
  redirect(GUIDANCE_CANONICAL_JOURNEY_ENTRY);
}
