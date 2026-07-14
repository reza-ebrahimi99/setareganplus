import {
  FormFieldSemantic,
  type FormSubmissionStatus,
} from "@/generated/prisma/enums";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import {
  buildFormSubmissionWhere,
  type ResponseListFilters,
} from "@/lib/forms/response-filters";
import { prisma } from "@/lib/prisma";

export type { ResponseListFilters } from "@/lib/forms/response-filters";

export type ResponseListItem = {
  id: string;
  submittedAt: Date;
  mobile: string | null;
  email: string | null;
  status: FormSubmissionStatus;
  isDuplicateInForm: boolean;
  branchName: string;
  displayName: string | null;
};

export type FormResponsesPageData = {
  form: {
    id: string;
    slug: string;
    title: string;
  };
  items: ResponseListItem[];
  total: number;
  filters: ResponseListFilters;
};

export type LoadFormResponsesResult =
  | { ok: true; data: FormResponsesPageData }
  | { ok: false; reason: "not_found" | "unavailable" };

const NAME_FIELD_KEYS = [
  "first_name",
  "lastname",
  "last_name",
  "full_name",
  "name",
  "first-name",
  "last-name",
  "full-name",
] as const;

function buildDisplayName(
  answers: Array<{
    fieldKey: string;
    valueText: string | null;
    field: { semantic: string } | null;
  }>,
): string | null {
  let first = "";
  let last = "";
  let full = "";

  for (const answer of answers) {
    const text = answer.valueText?.trim() ?? "";
    if (!text) {
      continue;
    }

    const semantic = answer.field?.semantic;
    const key = answer.fieldKey.toLowerCase();

    if (
      semantic === FormFieldSemantic.FIRST_NAME ||
      key === "first_name" ||
      key === "first-name"
    ) {
      first = text;
    } else if (
      semantic === FormFieldSemantic.LAST_NAME ||
      key === "last_name" ||
      key === "lastname" ||
      key === "last-name"
    ) {
      last = text;
    } else if (key === "full_name" || key === "full-name" || key === "name") {
      full = text;
    }
  }

  if (full) {
    return full;
  }

  const combined = `${first} ${last}`.trim();
  return combined || null;
}

/**
 * Loads org-scoped form submissions in one query (branch + name answers included).
 * Filters apply in SQL — no per-row follow-up queries.
 */
export async function loadFormResponses(
  formId: string,
  filters: ResponseListFilters,
): Promise<LoadFormResponsesResult> {
  try {
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
        publishedVersion: {
          select: { title: true },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { title: true },
        },
      },
    });

    if (!form) {
      return { ok: false, reason: "not_found" };
    }

    const where = buildFormSubmissionWhere(
      organization.id,
      form.id,
      filters,
    );

    const [total, rows] = await prisma.$transaction([
      prisma.formSubmission.count({ where }),
      prisma.formSubmission.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        take: 100,
        select: {
          id: true,
          submittedAt: true,
          mobile: true,
          normalizedMobile: true,
          email: true,
          status: true,
          isDuplicateInForm: true,
          branch: {
            select: { name: true },
          },
          answers: {
            where: {
              OR: [
                {
                  field: {
                    semantic: {
                      in: [
                        FormFieldSemantic.FIRST_NAME,
                        FormFieldSemantic.LAST_NAME,
                      ],
                    },
                  },
                },
                {
                  fieldKey: {
                    in: [...NAME_FIELD_KEYS],
                  },
                },
              ],
            },
            select: {
              fieldKey: true,
              valueText: true,
              field: {
                select: { semantic: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      ok: true,
      data: {
        form: {
          id: form.id,
          slug: form.slug,
          title:
            form.publishedVersion?.title ??
            form.versions[0]?.title ??
            form.slug,
        },
        total,
        filters,
        items: rows.map((row) => ({
          id: row.id,
          submittedAt: row.submittedAt,
          mobile: row.mobile ?? row.normalizedMobile ?? null,
          email: row.email,
          status: row.status,
          isDuplicateInForm: row.isDuplicateInForm,
          branchName: row.branch.name,
          displayName: buildDisplayName(row.answers),
        })),
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export type SubmissionDetailData = {
  form: {
    id: string;
    slug: string;
    title: string;
  };
  submission: {
    id: string;
    submittedAt: Date;
    mobile: string | null;
    email: string | null;
    status: FormSubmissionStatus;
    isDuplicateInForm: boolean;
    branchName: string;
  };
  answers: Array<{
    fieldId: string;
    fieldKey: string;
    label: string;
    type: import("@/generated/prisma/enums").FormFieldType;
    sortOrder: number;
    config: unknown;
    valueText: string | null;
    valueLongText: string | null;
    valueNumber: { toString(): string } | null;
    valueDate: Date | null;
    valueJson: unknown;
  }>;
};

export type LoadSubmissionDetailResult =
  | { ok: true; data: SubmissionDetailData }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * Loads one submission with all answers + field labels in a single query,
 * ordered by the published form definition sortOrder.
 */
export async function loadSubmissionDetail(
  formId: string,
  submissionId: string,
): Promise<LoadSubmissionDetailResult> {
  try {
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
        publishedVersion: { select: { title: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { title: true },
        },
      },
    });

    if (!form) {
      return { ok: false, reason: "not_found" };
    }

    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: submissionId,
        organizationId: organization.id,
        formId: form.id,
        deletedAt: null,
      },
      select: {
        id: true,
        submittedAt: true,
        mobile: true,
        normalizedMobile: true,
        email: true,
        status: true,
        isDuplicateInForm: true,
        branch: { select: { name: true } },
        answers: {
          orderBy: {
            field: { sortOrder: "asc" },
          },
          select: {
            fieldId: true,
            fieldKey: true,
            valueText: true,
            valueLongText: true,
            valueNumber: true,
            valueDate: true,
            valueJson: true,
            field: {
              select: {
                label: true,
                type: true,
                sortOrder: true,
                config: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return { ok: false, reason: "not_found" };
    }

    return {
      ok: true,
      data: {
        form: {
          id: form.id,
          slug: form.slug,
          title:
            form.publishedVersion?.title ??
            form.versions[0]?.title ??
            form.slug,
        },
        submission: {
          id: submission.id,
          submittedAt: submission.submittedAt,
          mobile: submission.mobile ?? submission.normalizedMobile,
          email: submission.email,
          status: submission.status,
          isDuplicateInForm: submission.isDuplicateInForm,
          branchName: submission.branch.name,
        },
        answers: submission.answers.map((answer) => ({
          fieldId: answer.fieldId,
          fieldKey: answer.fieldKey,
          label: answer.field.label,
          type: answer.field.type,
          sortOrder: answer.field.sortOrder,
          config: answer.field.config,
          valueText: answer.valueText,
          valueLongText: answer.valueLongText,
          valueNumber: answer.valueNumber,
          valueDate: answer.valueDate,
          valueJson: answer.valueJson,
        })),
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
