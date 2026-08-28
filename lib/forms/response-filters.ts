import type { Prisma } from "@/generated/prisma/client";
import {
  tehranDayBoundsUtc,
  tehranLocalToUtc,
} from "@/lib/datetime/tehran-zone";
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

function parseGregorianYmd(
  value: string,
): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const probe = tehranLocalToUtc(year, month, day, 12, 0, 0);
  if (Number.isNaN(probe.getTime())) {
    return null;
  }
  return { year, month, day };
}

/**
 * Start of the given Gregorian civil day in Asia/Tehran → UTC.
 * Filter `from`/`to` values are Gregorian YYYY-MM-DD from JalaliDateField.
 */
function parseDayStart(value: string): Date | null {
  const parts = parseGregorianYmd(value);
  if (!parts) {
    return null;
  }
  return tehranDayBoundsUtc(parts.year, parts.month, parts.day).startUtc;
}

/**
 * Inclusive end of the given Gregorian civil day in Asia/Tehran → UTC
 * (23:59:59.999 Tehran), so same-day rows are not dropped.
 */
function parseDayEnd(value: string): Date | null {
  const parts = parseGregorianYmd(value);
  if (!parts) {
    return null;
  }
  const { endUtc } = tehranDayBoundsUtc(parts.year, parts.month, parts.day);
  // tehranDayBoundsUtc ends at 23:59:59.000; include the final second fully.
  return new Date(endUtc.getTime() + 999);
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

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970");
  const month = Number(
    parts.find((part) => part.type === "month")?.value ?? "01",
  );
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "01");

  return tehranLocalToUtc(year, month, day, 0, 0, 0);
}
