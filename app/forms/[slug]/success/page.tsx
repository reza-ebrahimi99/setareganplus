import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormFieldSemantic } from "@/generated/prisma/enums";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { PublicSuccessPanel } from "@/components/forms/PublicSuccessPanel";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { loadPublicFormBySlug } from "@/lib/forms/load-public-form";
import { getPublicFormPath } from "@/lib/forms/public-form-url";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { SITE_NAME } from "@/lib/seo/site-metadata";

export const dynamic = "force-dynamic";

type SuccessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return typeof value === "string" ? value.trim() : "";
}

function buildSubmitterName(
  answers: Array<{
    fieldKey: string;
    valueText: string | null;
    valueLongText: string | null;
    field: { semantic: FormFieldSemantic } | null;
  }>,
): string | null {
  let first = "";
  let last = "";
  let full = "";

  for (const answer of answers) {
    const text = (answer.valueText ?? answer.valueLongText ?? "").trim();
    if (!text) continue;

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

  if (full) return full;
  const combined = `${first} ${last}`.trim();
  return combined || null;
}

export async function generateMetadata({
  params,
}: SuccessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicFormBySlug(slug);
  const formTitle = result.ok ? result.data.version.title : null;
  const title = formTitle
    ? `ثبت موفق · ${formTitle} | ${SITE_NAME}`
    : `ثبت موفق | ${SITE_NAME}`;

  return createPageMetadata({
    title,
    description: "تأیید ثبت موفق فرم در ستارگان پلاس.",
    path: `${getPublicFormPath(slug)}/success`,
    robots: { index: false, follow: false },
  });
}

export default async function PublicFormSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const trackingCode = one(query.code);
  const result = await loadPublicFormBySlug(slug);

  // Success page only makes sense for forms that (still) have a public identity.
  // If the slug never existed, 404. If paused after submit, still show generic confirmation.
  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  const confirmationMessage =
    result.ok && result.data.version.confirmationMessage.trim()
      ? result.data.version.confirmationMessage.trim()
      : "اطلاعات شما با موفقیت ثبت شد.";

  const formTitle = result.ok ? result.data.version.title : "فرم";

  let submitterName: string | null = null;
  let resolvedTrackingCode: string | null = null;
  let submittedAtLabel: string | null = null;

  if (trackingCode) {
    try {
      const organization = await getCurrentOrganization();
      const submission = await prisma.formSubmission.findFirst({
        where: {
          organizationId: organization.id,
          trackingCode,
          deletedAt: null,
          form: { slug, deletedAt: null },
        },
        select: {
          trackingCode: true,
          submittedAt: true,
          formVersion: { select: { title: true } },
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
                    in: [
                      "first_name",
                      "first-name",
                      "last_name",
                      "lastname",
                      "last-name",
                      "full_name",
                      "full-name",
                      "name",
                    ],
                  },
                },
              ],
            },
            select: {
              fieldKey: true,
              valueText: true,
              valueLongText: true,
              field: { select: { semantic: true } },
            },
          },
        },
      });

      if (submission?.trackingCode) {
        resolvedTrackingCode = submission.trackingCode;
        submitterName = buildSubmitterName(submission.answers);
        submittedAtLabel = formatJalaliDateTimeShort(submission.submittedAt);
      }
    } catch {
      // Fall through to generic success — never leak IDs or fail the page.
    }
  }

  return (
    <PublicFormShell>
      <PublicSuccessPanel
        title="ثبت با موفقیت انجام شد"
        subtitle={formTitle}
        message={confirmationMessage}
        submitterName={submitterName}
        trackingCode={resolvedTrackingCode}
        submittedAtLabel={submittedAtLabel}
      />
    </PublicFormShell>
  );
}
