/**
 * Legacy guidance pre-registration (/guidance/pre-register).
 *
 * Compatibility redirect only. Pre-registration is no longer a competing
 * entry experience — a guidance case is created automatically on first
 * authenticated visit to the dashboard. The server actions in ./actions.ts
 * are intentionally left in place; other code still imports them.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function GuidancePreRegisterPage() {
  redirect(GUIDANCE_CANONICAL_DASHBOARD);
}
