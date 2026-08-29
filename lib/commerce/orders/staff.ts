/**
 * Staff members eligible as booklet handover owners (مسئول تحویل).
 */

import { SystemRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type CommerceStaffOption = {
  id: string;
  name: string;
};

export async function listCommerceHandoverStaff(
  organizationId: string,
): Promise<CommerceStaffOption[]> {
  const rows = await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: "ACTIVE",
      role: { notIn: [SystemRole.STUDENT, SystemRole.PARENT] },
      user: { deletedAt: null, status: "ACTIVE" },
    },
    select: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });

  const seen = new Set<string>();
  const staff: CommerceStaffOption[] = [];
  for (const row of rows) {
    if (seen.has(row.user.id)) continue;
    seen.add(row.user.id);
    const name = `${row.user.firstName} ${row.user.lastName}`.trim();
    staff.push({ id: row.user.id, name: name || "کارمند" });
  }
  return staff;
}

export async function assertCommerceHandoverStaff(params: {
  organizationId: string;
  userId: string;
}): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
      status: "ACTIVE",
      role: { notIn: [SystemRole.STUDENT, SystemRole.PARENT] },
      user: { deletedAt: null, status: "ACTIVE" },
    },
    select: {
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!membership) {
    return { ok: false, error: "مسئول تحویل انتخاب‌شده معتبر نیست." };
  }
  const name = `${membership.user.firstName} ${membership.user.lastName}`.trim();
  return { ok: true, name: name || "کارمند" };
}
