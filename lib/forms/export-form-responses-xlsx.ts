import ExcelJS from "exceljs";
import { FormFieldType } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { formatAnswerForCsv } from "@/lib/forms/csv";
import { getFormSubmissionStatusLabel } from "@/lib/forms/form-submission-status-labels";
import {
  buildFormSubmissionWhere,
  type ResponseListFilters,
} from "@/lib/forms/response-filters";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export type ExportFormResponsesXlsxResult =
  | {
      ok: true;
      filename: string;
      buffer: Buffer;
    }
  | { ok: false; reason: "not_found" | "unavailable" };

function formatSubmittedAtJalali(date: Date): string {
  const day = formatJalaliDateShort(date);
  const time = toPersianDigits(formatTehranTime24(date));
  return `${day} ${time}`;
}

/**
 * Real XLSX workbook for Excel (avoids regional CSV delimiter issues).
 * Authenticated + organization-scoped. Same filters as CSV export.
 */
export async function exportFormResponsesXlsx(
  formId: string,
  filters: ResponseListFilters,
): Promise<ExportFormResponsesXlsxResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, reason: "unavailable" };
  }
  const organization = session.organization;

  try {
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: organization.id,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        publishedVersionId: true,
        publishedVersion: {
          select: {
            title: true,
            fields: {
              orderBy: { sortOrder: "asc" },
              select: {
                fieldKey: true,
                label: true,
                type: true,
                config: true,
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            title: true,
            fields: {
              orderBy: { sortOrder: "asc" },
              select: {
                fieldKey: true,
                label: true,
                type: true,
                config: true,
              },
            },
          },
        },
      },
    });

    if (!form) {
      return { ok: false, reason: "not_found" };
    }

    const columnSource =
      form.publishedVersion?.fields ?? form.versions[0]?.fields ?? [];
    const columns = columnSource.filter(
      (field) => field.type !== FormFieldType.INFORMATIONAL,
    );

    const where = buildFormSubmissionWhere(
      organization.id,
      form.id,
      filters,
    );

    const submissions = await prisma.formSubmission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      select: {
        submittedAt: true,
        status: true,
        isDuplicateInForm: true,
        normalizedMobile: true,
        email: true,
        branch: { select: { name: true } },
        answers: {
          select: {
            fieldKey: true,
            valueText: true,
            valueLongText: true,
            valueNumber: true,
            valueDate: true,
            valueJson: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "StarOS";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("پاسخ‌ها", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
    });

    const headers = [
      "تاریخ ثبت",
      "وضعیت",
      "تکراری",
      "شعبه",
      "موبایل",
      "ایمیل",
      ...columns.map((column) => column.label),
    ];

    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "right", vertical: "middle" };

    for (const submission of submissions) {
      const byKey = new Map(
        submission.answers.map((answer) => [answer.fieldKey, answer]),
      );
      const fieldCells = columns.map((column) => {
        const answer = byKey.get(column.fieldKey);
        if (!answer) return "";
        return formatAnswerForCsv(column.type, answer, column.config);
      });

      sheet.addRow([
        formatSubmittedAtJalali(submission.submittedAt),
        getFormSubmissionStatusLabel(submission.status),
        submission.isDuplicateInForm ? "بله" : "خیر",
        submission.branch.name,
        submission.normalizedMobile
          ? toPersianDigits(submission.normalizedMobile)
          : "",
        submission.email ?? "",
        ...fieldCells,
      ]);
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, submissions.length + 1), column: headers.length },
    };

    for (let i = 1; i <= headers.length; i += 1) {
      const column = sheet.getColumn(i);
      let max = String(headers[i - 1] ?? "").length;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? "").length;
        if (len > max) max = len;
      });
      column.width = Math.min(42, Math.max(12, max + 2));
      column.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeSlug = form.slug.replace(/[^a-z0-9-_]/gi, "-");
    const stamp = new Date().toISOString().slice(0, 10);

    return {
      ok: true,
      filename: `form-${safeSlug}-responses-${stamp}.xlsx`,
      buffer,
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
