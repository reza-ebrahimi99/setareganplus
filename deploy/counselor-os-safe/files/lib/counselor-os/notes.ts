/**
 * Counselor notes — persistent, visibility-scoped.
 */

import { CounselorNoteVisibility } from "@/generated/prisma/enums";
import {
  assertCounselorCanAccessStudent,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export async function listCounselorNotes(
  ctx: CounselorContext,
  studentId: string,
) {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const rows = await prisma.counselorNote.findMany({
    where: {
      organizationId: ctx.organizationId,
      studentId,
      deletedAt: null,
      OR: [
        { counselorUserId: ctx.userId },
        { visibility: { not: CounselorNoteVisibility.PRIVATE } },
      ],
    },
    include: {
      counselor: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    visibility: r.visibility,
    authorName: `${r.counselor.firstName} ${r.counselor.lastName}`.trim(),
    createdLabel: formatJalaliDateTimeShort(r.createdAt),
  }));
}

export async function addCounselorNote(params: {
  ctx: CounselorContext;
  studentId: string;
  body: string;
  visibility?: CounselorNoteVisibility;
}) {
  await assertCounselorCanAccessStudent({
    organizationId: params.ctx.organizationId,
    counselorUserId: params.ctx.userId,
    studentId: params.studentId,
    canReview: params.ctx.canReview,
  });

  return prisma.counselorNote.create({
    data: {
      organizationId: params.ctx.organizationId,
      studentId: params.studentId,
      counselorUserId: params.ctx.userId,
      body: params.body.trim(),
      visibility: params.visibility ?? CounselorNoteVisibility.GENERAL,
    },
  });
}
