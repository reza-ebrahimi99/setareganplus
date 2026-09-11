/**
 * Legacy Major Office academic intake (/ms/academic).
 * Compatibility redirect only — no Major Office UI is reachable.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function MajorOfficeAcademicPage() {
  redirect(GUIDANCE_CANONICAL_DASHBOARD);
}
