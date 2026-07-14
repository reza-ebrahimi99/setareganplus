import { FormFieldType } from "@/generated/prisma/enums";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import {
  buildFormSubmissionWhere,
  type ResponseListFilters,
} from "@/lib/forms/response-filters";
import { buildCsvDocument, formatAnswerForCsv } from "@/lib/forms/csv";
import { getFormSubmissionStatusLabel } from "@/lib/forms/form-submission-status-labels";
import { prisma } from "@/lib/prisma";

export type ExportFormResponsesResult =
  | {
      ok: true;
      filename: string;
      csv: string;
    }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * Builds a filter-aware CSV for one form.
 * Columns use field labels from the published (or latest) version.
 * Answers are matched by stable fieldKey across versions.
 */
export async function exportFormResponsesCsv(
  formId: string,
  filters: ResponseListFilters,
): Promise<ExportFormResponsesResult> {
  try {
    // TODO(auth): Require authenticated admin before production export.
    const organization = await getCurrentOrganization();

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

    const header = [
      "تاریخ ثبت",
      "وضعیت",
      "تکراری",
      "شعبه",
      "موبایل",
      "ایمیل",
      ...columns.map((column) => column.label),
    ];

    const rows: string[][] = [header];

    for (const submission of submissions) {
      const byKey = new Map(
        submission.answers.map((answer) => [answer.fieldKey, answer]),
      );

      const fieldCells = columns.map((column) => {
        const answer = byKey.get(column.fieldKey);
        if (!answer) {
          return "";
        }
        return formatAnswerForCsv(column.type, answer, column.config);
      });

      rows.push([
        submission.submittedAt.toISOString(),
        getFormSubmissionStatusLabel(submission.status),
        submission.isDuplicateInForm ? "بله" : "خیر",
        submission.branch.name,
        submission.normalizedMobile ?? "",
        submission.email ?? "",
        ...fieldCells,
      ]);
    }

    const title =
      form.publishedVersion?.title ?? form.versions[0]?.title ?? form.slug;
    const safeSlug = form.slug.replace(/[^a-z0-9-_]/gi, "-");
    const stamp = new Date().toISOString().slice(0, 10);

    return {
      ok: true,
      filename: `form-${safeSlug}-responses-${stamp}.csv`,
      csv: buildCsvDocument(rows),
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
