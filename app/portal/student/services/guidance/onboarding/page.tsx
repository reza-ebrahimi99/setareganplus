/**
 * Legacy guidance onboarding (/portal/student/services/guidance/onboarding).
 *
 * Compatibility redirect only. Onboarding is no longer a prerequisite for
 * the dashboard — the source of that requirement was removed from
 * app/portal/student/services/guidance/page.tsx, so this cannot loop.
 * Journey V2 step 1 prefills from any onboarding record that already exists;
 * the storage model and form component are deliberately left in the tree.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function GuidanceOnboardingPage() {
  redirect(GUIDANCE_CANONICAL_DASHBOARD);
}
