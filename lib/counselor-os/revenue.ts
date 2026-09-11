/**
 * Counselor OS — read-only guidance package revenue.
 *
 * Attribution (v1): revenue belongs to the counselor of the student's
 * CURRENT ACTIVE CounselorStudentAssignment. Historical accounting is
 * intentionally not implemented.
 *
 * Counts ONLY successful (PAID) guidance PACKAGE payments.
 * Uses finalAmountRials (amount after discount). Holland standalone
 * payments are excluded. Failed / pending / cancelled are excluded.
 */

import { PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { formatTomanFromRials } from "@/lib/counselor-os/labels";
import {
  jalaliMonthLength,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import { tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";

export const COUNSELOR_REVENUE_ATTRIBUTION_NOTE =
  "مجموع پرداخت پرونده‌های تحت پوشش — بر اساس مشاور فعلی پرونده. حسابداری تاریخی هنوز فعال نیست.";

type PaymentRow = {
  id: string;
  payableId: string;
  payableType: string;
  status: PaymentStatus;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  paidAt: Date | null;
  idempotencyKey: string;
  description: string | null;
};

export type CounselorRevenueTotals = {
  totalRials: number;
  monthRials: number;
  successfulPaymentCount: number;
  payingStudentCount: number;
  totalTomanLabel: string;
  monthTomanLabel: string;
};

export type CounselorRevenueByCounselor = Map<string, CounselorRevenueTotals>;

export function isHollandStandalonePayment(row: {
  idempotencyKey: string;
  description: string | null;
  payableType: string;
}): boolean {
  const blob = `${row.idempotencyKey} ${row.description ?? ""} ${row.payableType}`.toLowerCase();
  return blob.includes("holland") || blob.includes("رغبت");
}

export function isSuccessfulGuidancePackagePayment(row: {
  status: PaymentStatus | string;
  payableType: string;
  idempotencyKey: string;
  description: string | null;
}): boolean {
  if (row.status !== PaymentStatus.PAID) return false;
  if (isHollandStandalonePayment(row)) return false;
  return (
    row.payableType === "GUIDANCE_PACKAGE" ||
    row.idempotencyKey.includes("guidance-v2-package") ||
    row.idempotencyKey.includes("guidance-package")
  );
}

export function emptyCounselorRevenue(): CounselorRevenueTotals {
  return {
    totalRials: 0,
    monthRials: 0,
    successfulPaymentCount: 0,
    payingStudentCount: 0,
    totalTomanLabel: formatTomanFromRials(0),
    monthTomanLabel: formatTomanFromRials(0),
  };
}

function toTotals(
  totalRials: number,
  monthRials: number,
  successfulPaymentCount: number,
  payingStudentCount: number,
): CounselorRevenueTotals {
  return {
    totalRials,
    monthRials,
    successfulPaymentCount,
    payingStudentCount,
    totalTomanLabel: formatTomanFromRials(totalRials),
    monthTomanLabel: formatTomanFromRials(monthRials),
  };
}

export function tehranJalaliMonthBoundsUtc(now = new Date()): {
  startUtc: Date;
  endUtc: Date;
} {
  const j = utcToJalaliInTehran(now);
  const lastDay = jalaliMonthLength(j.jy, j.jm);
  const { startUtc } = tehranDayBoundsUtc(j.jy, j.jm, 1);
  const { endUtc } = tehranDayBoundsUtc(j.jy, j.jm, lastDay);
  return { startUtc, endUtc };
}

function dedupePaidPackageIntents(rows: PaymentRow[]): PaymentRow[] {
  const best = new Map<string, PaymentRow>();
  for (const row of rows) {
    if (!isSuccessfulGuidancePackagePayment(row)) continue;
    const key = `${row.payableType}:${row.payableId}`;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, row);
      continue;
    }
    const existingAt = existing.paidAt?.getTime() ?? 0;
    const nextAt = row.paidAt?.getTime() ?? 0;
    if (nextAt >= existingAt) best.set(key, row);
  }
  return [...best.values()];
}

/**
 * Batched package-revenue attribution for many counselors.
 * One PaymentIntent query — never per-counselor.
 */
export async function loadCounselorPackageRevenueByCounselor(params: {
  organizationId: string;
  counselorUserIds: string[];
}): Promise<CounselorRevenueByCounselor> {
  const result: CounselorRevenueByCounselor = new Map();
  for (const id of params.counselorUserIds) {
    result.set(id, emptyCounselorRevenue());
  }
  if (params.counselorUserIds.length === 0) return result;

  const assignments = await prisma.counselorStudentAssignment.findMany({
    where: {
      organizationId: params.organizationId,
      counselorUserId: { in: params.counselorUserIds },
      status: "ACTIVE",
    },
    select: {
      counselorUserId: true,
      studentId: true,
      student: {
        select: {
          id: true,
          portalAccountLinks: {
            where: { deletedAt: null, isActive: true },
            take: 1,
            select: { userId: true },
          },
          guidancePlans: {
            where: { deletedAt: null, journeyVersion: 2 },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { id: true, userId: true },
          },
        },
      },
    },
  });

  const payableToCounselor = new Map<string, string>();
  const payableToStudent = new Map<string, string>();
  const payableIds: string[] = [];

  for (const row of assignments) {
    const counselorUserId = row.counselorUserId;
    const student = row.student;
    const plan = student.guidancePlans[0];
    const userId = student.portalAccountLinks[0]?.userId ?? plan?.userId ?? null;
    const ids = [plan?.id, student.id, userId].filter(
      (id): id is string => Boolean(id),
    );
    for (const id of ids) {
      payableToCounselor.set(id, counselorUserId);
      payableToStudent.set(id, student.id);
      payableIds.push(id);
    }
  }

  const uniquePayableIds = [...new Set(payableIds)];
  if (uniquePayableIds.length === 0) return result;

  const intents = await prisma.paymentIntent.findMany({
    where: {
      organizationId: params.organizationId,
      status: PaymentStatus.PAID,
      payableId: { in: uniquePayableIds },
    },
    select: {
      id: true,
      payableId: true,
      payableType: true,
      status: true,
      amountRials: true,
      discountRials: true,
      finalAmountRials: true,
      paidAt: true,
      idempotencyKey: true,
      description: true,
    },
  });

  const { startUtc, endUtc } = tehranJalaliMonthBoundsUtc();
  const acc = new Map<
    string,
    { total: number; month: number; count: number; students: Set<string> }
  >();
  for (const id of params.counselorUserIds) {
    acc.set(id, { total: 0, month: 0, count: 0, students: new Set() });
  }

  for (const row of dedupePaidPackageIntents(intents)) {
    const counselorUserId = payableToCounselor.get(row.payableId);
    if (!counselorUserId) continue;
    const bucket = acc.get(counselorUserId);
    if (!bucket) continue;
    const amount = row.finalAmountRials;
    bucket.total += amount;
    bucket.count += 1;
    const studentId = payableToStudent.get(row.payableId);
    if (studentId) bucket.students.add(studentId);
    if (row.paidAt && row.paidAt >= startUtc && row.paidAt <= endUtc) {
      bucket.month += amount;
    }
  }

  for (const [id, bucket] of acc) {
    result.set(
      id,
      toTotals(bucket.total, bucket.month, bucket.count, bucket.students.size),
    );
  }
  return result;
}

export async function loadCounselorPackageRevenue(params: {
  organizationId: string;
  counselorUserId: string;
}): Promise<CounselorRevenueTotals> {
  const map = await loadCounselorPackageRevenueByCounselor({
    organizationId: params.organizationId,
    counselorUserIds: [params.counselorUserId],
  });
  return map.get(params.counselorUserId) ?? emptyCounselorRevenue();
}
