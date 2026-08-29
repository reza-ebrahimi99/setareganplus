import { getAdminSession } from "@/lib/auth/require-admin";
import {
  buildFormSubmissionWhere,
  getTehranDayStart,
  type ResponseListFilters,
} from "@/lib/forms/response-filters";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type FormResponseStats = {
  total: number;
  today: number;
  duplicates: number;
  uniqueMobiles: number;
  latestSubmittedAt: Date | null;
};

export type LoadFormResponseStatsResult =
  | { ok: true; stats: FormResponseStats }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * Efficient aggregate stats for the responses list (same filters as list/export).
 * Unique mobiles: Prisma distinct on normalizedMobile (no raw SQL).
 */
export async function loadFormResponseStats(
  formId: string,
  filters: ResponseListFilters,
): Promise<LoadFormResponseStatsResult> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  const organization = session.organization;

  try {
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: organization.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!form) {
      return { ok: false, reason: "not_found" };
    }

    const where = buildFormSubmissionWhere(
      organization.id,
      form.id,
      filters,
    );

    const todayStart = getTehranDayStart();

    const [total, today, duplicates, uniqueMobileRows, latest] =
      await prisma.$transaction([
        prisma.formSubmission.count({ where }),
        prisma.formSubmission.count({
          where: {
            AND: [where, { submittedAt: { gte: todayStart } }],
          },
        }),
        prisma.formSubmission.count({
          where: {
            AND: [where, { isDuplicateInForm: true }],
          },
        }),
        prisma.formSubmission.findMany({
          where: {
            AND: [where, { normalizedMobile: { not: null } }],
          },
          distinct: ["normalizedMobile"],
          select: { normalizedMobile: true },
        }),
        prisma.formSubmission.findFirst({
          where,
          orderBy: { submittedAt: "desc" },
          select: { submittedAt: true },
        }),
      ]);

    return {
      ok: true,
      stats: {
        total,
        today,
        duplicates,
        uniqueMobiles: uniqueMobileRows.length,
        latestSubmittedAt: latest?.submittedAt ?? null,
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
