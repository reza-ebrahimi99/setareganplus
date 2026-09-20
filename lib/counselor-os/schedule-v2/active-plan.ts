import {
  CounselorSchedulePlanStatus,
  type CounselorScheduleSessionKind,
} from "@/generated/prisma/enums";
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
