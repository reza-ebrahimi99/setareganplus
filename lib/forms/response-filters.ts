import type { Prisma } from "@/generated/prisma/client";
import { isFormSubmissionStatus } from "@/lib/forms/form-submission-status-labels";

export type ResponseListFilters = {
  q?: string;
  mobile?: string;
  status?: string;
  duplicateOnly?: boolean;
  from?: string;
  to?: string;
};

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

export function parseResponseFiltersFromSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ResponseListFilters {
  return {
    q: readParam(raw.q)?.trim() || undefined,
    mobile: readParam(raw.mobile)?.trim() || undefined,
    status: readParam(raw.status)?.trim() || undefined,
    duplicateOnly: readParam(raw.duplicate) === "1",
    from: readParam(raw.from)?.trim() || undefined,
    to: readParam(raw.to)?.trim() || undefined,
  };
}

/** Builds the query string used by the responses page and export link. */
export function buildResponseFiltersQuery(
  filters: ResponseListFilters,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.mobile) params.set("mobile", filters.mobile);
  if (filters.status) params.set("status", filters.status);
  if (filters.duplicateOnly) params.set("duplicate", "1");
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

function parseDayStart(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDayEnd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Shared FormSubmission where clause for list, export, and stats.
 * Always org + form scoped; soft-deleted excluded.
 */
export function buildFormSubmissionWhere(
  organizationId: string,
  formId: string,
  filters: ResponseListFilters,
): Prisma.FormSubmissionWhereInput {
  const where: Prisma.FormSubmissionWhereInput = {
    organizationId,
    formId,
    deletedAt: null,
  };

  const and: Prisma.FormSubmissionWhereInput[] = [];

  const q = filters.q?.trim();
  if (q) {
    and.push({
      OR: [
        { mobile: { contains: q } },
        { normalizedMobile: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const mobile = filters.mobile?.trim();
  if (mobile) {
    and.push({
      OR: [
        { mobile: { contains: mobile } },
        { normalizedMobile: { contains: mobile } },
      ],
    });
  }

  if (filters.status && isFormSubmissionStatus(filters.status)) {
    and.push({ status: filters.status });
  }

  if (filters.duplicateOnly) {
    and.push({ isDuplicateInForm: true });
  }

  const from = filters.from ? parseDayStart(filters.from) : null;
  const to = filters.to ? parseDayEnd(filters.to) : null;
  if (from || to) {
    and.push({
      submittedAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

/** Start of "today" in Asia/Tehran for stats cards. */
export function getTehranDayStart(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  // Approximate Tehran midnight as UTC+03:30 without DST handling complexity.
  return new Date(`${year}-${month}-${day}T00:00:00.000+03:30`);
}
