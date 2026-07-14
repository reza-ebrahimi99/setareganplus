import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormFieldType } from "@/generated/prisma/enums";
import { PublicForm } from "@/components/forms/PublicForm";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { AVAILABILITY_MESSAGES } from "@/lib/forms/evaluate-form-availability";
import { getFormPurposeLabel } from "@/lib/forms/form-purpose-labels";
import { loadPublicFormBySlug } from "@/lib/forms/load-public-form";

export const dynamic = "force-dynamic";

type PublicFormPageProps = {
  params: Promise<{ slug: string }>;
};

function UnavailableState({
  title,
  description,
  posterUrl,
  posterAlt,
}: {
  title: string;
  description: string;
  posterUrl?: string | null;
  posterAlt?: string | null;
}) {
  return (
    <PublicFormShell>
      <div className="space-y-6">
        {posterUrl ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- Nginx /media */}
            <img
              src={posterUrl}
              alt={posterAlt?.trim() || title}
              className="mx-auto h-auto max-h-[min(40vh,22rem)] w-full object-contain"
            />
          </div>
        ) : null}
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] sm:px-10">
          <h1 className="text-xl font-bold text-primary sm:text-2xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted">
            {description}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </PublicFormShell>
  );
}

export async function generateMetadata({
  params,
}: PublicFormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicFormBySlug(slug);

  if (!result.ok) {
    const title =
      result.meta?.title?.trim() || "فرم در دسترس نیست";
    return {
      title,
      description: result.message || "این فرم در حال حاضر برای ثبت‌نام عمومی فعال نیست.",
      robots: { index: false, follow: false },
    };
  }

  const description =
    result.data.version.description?.trim() ||
    `فرم «${result.data.version.title}» در ستارگان پلاس`;

  return {
    title: result.data.version.title,
    description,
    robots: { index: true, follow: true },
  };
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const result = await loadPublicFormBySlug(slug);

  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  if (!result.ok && result.reason === "org_unavailable") {
    return (
      <UnavailableState
        title="فرم موقتاً در دسترس نیست"
        description="ارتباط با سامانه برقرار نشد. لطفاً کمی بعد دوباره تلاش کنید."
      />
    );
  }

  if (!result.ok && result.reason === "not_open_yet") {
    return (
      <UnavailableState
        title={result.meta?.title ?? "ثبت‌نام هنوز آغاز نشده"}
        description={
          result.message ?? AVAILABILITY_MESSAGES.NOT_OPEN_YET
        }
        posterUrl={result.meta?.poster?.publicUrl}
        posterAlt={result.meta?.poster?.altText}
      />
    );
  }

  if (!result.ok && result.reason === "closed") {
    return (
      <UnavailableState
        title={result.meta?.title ?? "مهلت ثبت‌نام پایان یافته"}
        description={
          result.message ?? AVAILABILITY_MESSAGES.CLOSED_BY_DEADLINE
        }
        posterUrl={result.meta?.poster?.publicUrl}
        posterAlt={result.meta?.poster?.altText}
      />
    );
  }

  if (!result.ok && result.reason === "capacity_full") {
    return (
      <UnavailableState
        title={result.meta?.title ?? "ظرفیت تکمیل شده"}
        description={result.message ?? AVAILABILITY_MESSAGES.CAPACITY_FULL}
        posterUrl={result.meta?.poster?.publicUrl}
        posterAlt={result.meta?.poster?.altText}
      />
    );
  }

  if (!result.ok) {
    return (
      <UnavailableState
        title="این فرم اکنون فعال نیست"
        description="ثبت‌نام از طریق این آدرس متوقف شده یا هنوز منتشر نشده است. در صورت نیاز با مرکز آموزشی تماس بگیرید."
      />
    );
  }

  const { form, version, fields, poster } = result.data;
  const hasRequired = fields.some(
    (field) =>
      field.required && field.type !== FormFieldType.INFORMATIONAL,
  );

  return (
    <PublicFormShell>
      <article className="space-y-6">
        {poster ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- served via Nginx /media alias */}
            <img
              src={poster.publicUrl}
              alt={poster.altText?.trim() || version.title}
              width={1200}
              height={630}
              decoding="async"
              fetchPriority="high"
              className="mx-auto h-auto max-h-[min(52vh,28rem)] w-full object-contain"
            />
          </div>
        ) : null}

        <header className="space-y-3 text-center sm:text-start">
          <p className="inline-flex rounded-full bg-secondary/15 px-3 py-1 text-[11px] font-medium text-primary">
            {getFormPurposeLabel(form.purpose)}
          </p>
          <h1 className="text-2xl font-bold leading-10 text-primary sm:text-3xl">
            {version.title}
          </h1>
          {version.description ? (
            <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
              {version.description}
            </p>
          ) : null}
          {hasRequired ? (
            <p className="text-xs text-muted">
              فیلدهای دارای علامت{" "}
              <span className="text-danger" aria-hidden="true">
                *
              </span>{" "}
              الزامی هستند.
            </p>
          ) : null}
        </header>

        <section
          aria-label="فرم"
          className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:p-8"
        >
          <PublicForm data={result.data} />
        </section>
      </article>
    </PublicFormShell>
  );
}
