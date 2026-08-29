/**
 * Admin list / dashboard queries for Registration Management Center.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  RegistrationPaymentStatus,
  RegistrationProductType,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { jalaliTehranLocalToUtc, parseJalaliDateInput } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

export type RegistrationListFilters = {
  q?: string;
  flowKey?: string;
  productType?: RegistrationProductType;
  status?: RegistrationStatus;
  paymentStatus?: RegistrationPaymentStatus;
  fromJalali?: string;
  toJalali?: string;
  incompleteOnly?: boolean;
};

function parseOptionalDateStart(jalali: string | undefined): Date | null {
  if (!jalali?.trim()) return null;
  const parsed = parseJalaliDateInput(jalali.trim());
  if (!parsed) return null;
  return jalaliTehranLocalToUtc(parsed.jy, parsed.jm, parsed.jd, 0, 0, 0);
}

function parseOptionalDateEnd(jalali: string | undefined): Date | null {
  if (!jalali?.trim()) return null;
  const parsed = parseJalaliDateInput(jalali.trim());
  if (!parsed) return null;
  return jalaliTehranLocalToUtc(parsed.jy, parsed.jm, parsed.jd, 23, 59, 59);
}

export function registrationListWhere(
  organizationId: string,
  filters: RegistrationListFilters,
): Prisma.RegistrationWhereInput {
  const and: Prisma.RegistrationWhereInput[] = [
    { organizationId, deletedAt: null },
  ];

  if (filters.incompleteOnly) {
    and.push({
      status: {
        in: [
          RegistrationStatus.NEW,
          RegistrationStatus.INCOMPLETE,
          RegistrationStatus.NEEDS_CALL,
        ],
      },
      completionPercent: { lt: 100 },
    });
  }

  if (filters.status) and.push({ status: filters.status });
  if (filters.paymentStatus) and.push({ paymentStatus: filters.paymentStatus });
  if (filters.flowKey) and.push({ flowKey: filters.flowKey });
  if (filters.productType) and.push({ productType: filters.productType });

  const from = parseOptionalDateStart(filters.fromJalali);
  const to = parseOptionalDateEnd(filters.toJalali);
  if (from || to) {
    and.push({
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    });
  }

  const q = filters.q?.trim();
  if (q) {
    const latin = toLatinDigits(q);
    and.push({
      OR: [
        { registrationNumber: { contains: latin, mode: "insensitive" } },
        { studentFirstName: { contains: q, mode: "insensitive" } },
        { studentLastName: { contains: q, mode: "insensitive" } },
        { parentName: { contains: q, mode: "insensitive" } },
        { parentMobile: { contains: latin } },
        { parentMobileNormalized: { contains: latin } },
        { nationalCode: { contains: latin } },
      ],
    });
  }

  return { AND: and };
}

export async function loadRegistrationDashboardCounts(organizationId: string) {
  const base = { organizationId, deletedAt: null };
  const startOfToday = (() => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  })();

  const [
    today,
    incomplete,
    needsCall,
    waitingPayment,
    waitingDocuments,
    underReview,
    approved,
    newCount,
  ] = await Promise.all([
    prisma.registration.count({
      where: { ...base, createdAt: { gte: startOfToday } },
    }),
    prisma.registration.count({
      where: {
        ...base,
        status: {
          in: [RegistrationStatus.INCOMPLETE, RegistrationStatus.NEW],
        },
        completionPercent: { lt: 100 },
      },
    }),
    prisma.registration.count({
      where: { ...base, status: RegistrationStatus.NEEDS_CALL },
    }),
    prisma.registration.count({
      where: { ...base, status: RegistrationStatus.WAITING_PAYMENT },
    }),
    prisma.registration.count({
      where: { ...base, status: RegistrationStatus.WAITING_DOCUMENTS },
    }),
    prisma.registration.count({
      where: { ...base, status: RegistrationStatus.UNDER_REVIEW },
    }),
    prisma.registration.count({
      where: { ...base, status: RegistrationStatus.APPROVED },
    }),
    prisma.registration.count({
      where: { ...base, status: RegistrationStatus.NEW },
    }),
  ]);

  return {
    today,
    incomplete,
    abandoned: incomplete,
    needsCall,
    waitingPayment,
    waitingDocuments,
    underReview,
    approved,
    newCount,
  };
}

export type RegistrationListRow = {
  id: string;
  registrationNumber: string;
  applicant: string;
  formTitle: string;
  mobile: string;
  currentStep: number;
  lastCompletedStep: number;
  completionPercent: number;
  status: RegistrationStatus;
  paymentStatus: RegistrationPaymentStatus;
  productType: RegistrationProductType;
  flowKey: string;
  createdAt: Date;
  lastActivityAt: Date;
  leadId: string | null;
  abandonedReason: string | null;
};

export async function listRegistrations(params: {
  organizationId: string;
  filters: RegistrationListFilters;
  page: number;
  pageSize: number;
}): Promise<{ rows: RegistrationListRow[]; total: number }> {
  const where = registrationListWhere(params.organizationId, params.filters);
  const [total, rows] = await Promise.all([
    prisma.registration.count({ where }),
    prisma.registration.findMany({
      where,
      orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        registrationNumber: true,
        studentFirstName: true,
        studentLastName: true,
        parentName: true,
        productTitle: true,
        flowKey: true,
        parentMobileNormalized: true,
        parentMobile: true,
        currentStep: true,
        lastCompletedStep: true,
        completionPercent: true,
        status: true,
        paymentStatus: true,
        productType: true,
        createdAt: true,
        lastActivityAt: true,
        leadId: true,
        abandonedReason: true,
      },
    }),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      registrationNumber: row.registrationNumber,
      applicant:
        `${row.studentFirstName ?? ""} ${row.studentLastName ?? ""}`.trim() ||
        row.parentName ||
        "—",
      formTitle: row.productTitle || row.flowKey,
      mobile: row.parentMobileNormalized || row.parentMobile || "—",
      currentStep: row.currentStep,
      lastCompletedStep: row.lastCompletedStep,
      completionPercent: row.completionPercent,
      status: row.status,
      paymentStatus: row.paymentStatus,
      productType: row.productType,
      flowKey: row.flowKey,
      createdAt: row.createdAt,
      lastActivityAt: row.lastActivityAt,
      leadId: row.leadId,
      abandonedReason: row.abandonedReason,
    })),
  };
}

export function parseRegistrationListFilters(
  params: Record<string, string | string[] | undefined>,
): RegistrationListFilters {
  const str = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const productTypeRaw = str("productType");
  const statusRaw = str("status");
  const paymentRaw = str("payment");
  const productTypes = Object.values(RegistrationProductType) as string[];
  const statuses = Object.values(RegistrationStatus) as string[];
  const payments = Object.values(RegistrationPaymentStatus) as string[];

  return {
    q: str("q"),
    flowKey: str("form"),
    productType:
      productTypeRaw && productTypes.includes(productTypeRaw)
        ? (productTypeRaw as RegistrationProductType)
        : undefined,
    status:
      statusRaw && statuses.includes(statusRaw)
        ? (statusRaw as RegistrationStatus)
        : undefined,
    paymentStatus:
      paymentRaw && payments.includes(paymentRaw)
        ? (paymentRaw as RegistrationPaymentStatus)
        : undefined,
    fromJalali: str("from"),
    toJalali: str("to"),
    incompleteOnly: str("incomplete") === "1",
  };
}
