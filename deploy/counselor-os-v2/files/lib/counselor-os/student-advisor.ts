/**
 * Resolve which booking advisor a student should book with.
 */

import { CounselorAssignmentStatus } from "@/generated/prisma/enums";
import { resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import { ensureCounselorBookingService } from "@/lib/counselor-os/booking";
import { prisma } from "@/lib/prisma";

export async function resolveStudentCounselorAdvisor(params: {
  organizationId: string;
  studentId: string;
}) {
  const assignment = await prisma.counselorStudentAssignment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: CounselorAssignmentStatus.ACTIVE,
    },
    orderBy: { assignedAt: "desc" },
    select: { counselorUserId: true },
  });

  if (assignment) {
    const advisor = await resolveCounselorBookingAdvisor({
      organizationId: params.organizationId,
      userId: assignment.counselorUserId,
    });
    if (advisor) return advisor;
  }

  const service = await ensureCounselorBookingService(params.organizationId);
  const linked = await prisma.bookingAdvisorService.findFirst({
    where: {
      organizationId: params.organizationId,
      serviceId: service.id,
      advisor: { isActive: true, deletedAt: null },
    },
    include: {
      advisor: {
        select: { id: true, displayName: true, userId: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return linked?.advisor ?? null;
}
