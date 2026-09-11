/**
 * Canonical public entry (/entekhab).
 *
 * Compatibility redirect only. This route used to render its own portal
 * login form, which created a second guidance entry experience. All
 * authentication now happens on the canonical /portal route via middleware,
 * so unauthenticated visitors are sent to login with the dashboard as `next`.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_DASHBOARD } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function EntekhabEntryPage() {
  redirect(GUIDANCE_CANONICAL_DASHBOARD);
}
