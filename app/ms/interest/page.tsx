/**
 * Legacy Major Office interest assessment (/ms/interest).
 * Compatibility redirect only — no Major Office UI is reachable.
 * ./actions.ts stays in place; the assessment component still imports it.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function MajorOfficeInterestPage() {
  redirect(GUIDANCE_CANONICAL_DASHBOARD);
}
