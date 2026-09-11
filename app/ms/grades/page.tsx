/**
 * Legacy Major Office grades room (/ms/grades).
 * Compatibility redirect only — no Major Office UI is reachable.
 * ./actions.ts stays in place; shared forms still import it.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function MajorOfficeGradesPage() {
  redirect(GUIDANCE_CANONICAL_DASHBOARD);
}
