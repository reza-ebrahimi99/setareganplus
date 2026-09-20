/**
 * Supervisor KPI rollup from work queue (steps 11–18).
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import { loadCounselorWorkQueue } from "@/lib/counselor-os/work-queue";

export type ManagementOverviewModel = {
  byStep: Record<number, number>;
  waitingStudent: number;
  waitingCounselor: number;
  overdue: number;
  blocked: number;
  sessionsToday: number;
  readySanjesh: number;
  readyFinalize: number;
  totalActiveLate: number;
};

export async function loadManagementOverview(
  ctx: CounselorContext,
): Promise<ManagementOverviewModel> {
  const queue = await loadCounselorWorkQueue(ctx);
  const byStep: Record<number, number> = {};
  for (const item of queue.all) {
    if (item.currentStep >= 11) {
      byStep[item.currentStep] = (byStep[item.currentStep] ?? 0) + 1;
    }
  }
  return {
    byStep,
    waitingStudent: queue.counts.waiting_student,
    waitingCounselor: queue.counts.waiting_me,
    overdue: queue.counts.overdue,
    blocked: queue.counts.urgent,
    sessionsToday: queue.counts.sessions_today,
    readySanjesh: queue.counts.ready_sanjesh,
    readyFinalize: queue.counts.ready_finalize,
    totalActiveLate: queue.all.filter((i) => i.currentStep >= 11 && i.currentStep <= 18).length,
  };
}
