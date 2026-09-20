/**
 * Load next-action card for a counselor case (steps 11–18).
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import type { NextActionCard } from "@/lib/guidance/journey-v2/next-action";
import { loadCounselorNextActionView } from "@/lib/counselor-os/steps-11-18-workspace";

export async function loadCounselorCaseNextAction(
  ctx: CounselorContext,
  studentId: string,
): Promise<NextActionCard | null> {
  const view = await loadCounselorNextActionView(ctx, studentId);
  return view.kind === "card" ? view.card : null;
}
