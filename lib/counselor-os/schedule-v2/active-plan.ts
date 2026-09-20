import {
  CounselorSchedulePlanStatus,
  type CounselorScheduleSessionKind,
} from "@/generated/prisma/enums";
import { planLegacyArchivedAt } from "@/lib/counselor-os/schedule-v2/plan-title";
import { prisma } from "@/lib/prisma";

export async function findActiveSchedulePlan(params: {
  organizationId: string;
  advisorId: string;
  sessionKind: CounselorScheduleSessionKind;
}) {
  return prisma.counselorSchedulePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      advisorId: params.advisorId,
      sessionKind: params.sessionKind,
      status: CounselorSchedulePlanStatus.ACTIVE,
    },
    include: {
      days: {
        include: { windows: { orderBy: { sortOrder: "asc" } } },
        orderBy: { localDate: "asc" },
      },
    },
  });
}

/** True when advisor has any non-archived v2 plan for this session kind (legacy slots must be hidden). */
export async function hasNonArchivedSchedulePlans(params: {
  organizationId: string;
  advisorId: string;
  sessionKind: CounselorScheduleSessionKind;
}): Promise<boolean> {
  const rows = await prisma.counselorSchedulePlan.findMany({
    where: {
      organizationId: params.organizationId,
      advisorId: params.advisorId,
      sessionKind: params.sessionKind,
    },
    select: { legacyMeta: true },
  });
  return rows.some((row) => !planLegacyArchivedAt(row.legacyMeta));
}

export async function hasActiveSchedulePlan(params: {
  organizationId: string;
  advisorId: string;
  sessionKind: CounselorScheduleSessionKind;
}): Promise<boolean> {
  const row = await prisma.counselorSchedulePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      advisorId: params.advisorId,
      sessionKind: params.sessionKind,
      status: CounselorSchedulePlanStatus.ACTIVE,
    },
    select: { id: true },
  });
  return row != null;
}
