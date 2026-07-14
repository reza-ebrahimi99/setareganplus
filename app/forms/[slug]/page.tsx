import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormFieldType } from "@/generated/prisma/enums";
import { PublicForm } from "@/components/forms/PublicForm";
import { PublicFormHeader } from "@/components/forms/PublicFormHeader";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { AVAILABILITY_MESSAGES } from "@/lib/forms/evaluate-form-availability";
import { loadPublicFormBySlug } from "@/lib/forms/load-public-form";
import {
  getPublicFormCanonical,
  PUBLIC_SITE_ORIGIN,
} from "@/lib/forms/public-form-url";

export const dynamic = "force-dynamic";

type PublicFormPageProps = {
  params: Promise<{ slug: string }>;
};

function UnavailableState({
  title,
  description,
  purpose,
  posterUrl,
  posterAlt,
  status,
  capacity,
  remainingCapacity,
  showRemainingCapacity,
  registrationDeadline,
}: {
  title: string;
  description: string;
  purpose?: Parameters<typeof PublicFormHeader>[0]["purpose"];
  posterUrl?: string | null;
  posterAlt?: string | null;
  status: Parameters<typeof PublicFormHeader>[0]["status"];
  capacity?: number | null;
  remainingCapacity?: number | null;
  showRemainingCapacity?: boolean;
  registrationDeadline?: Date | null;
}) {
  return (
    <PublicFormShell>
      <div className="space-y-8">
        {purpose ? (
          <PublicFormHeader
            title={title}
            description={null}
            purpose={purpose}
            posterUrl={posterUrl}
            posterAlt={posterAlt}
            status={status}
            capacity={capacity ?? null}
            remainingCapacity={remainingCapacity ?? null}
            showRemainingCapacity={Boolean(showRemainingCapacity)}
            registrationDeadline={registrationDeadline ?? null}
          />
        ) : posterUrl ? (
          <div className="public-form-section overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- Nginx /media */}
            <img
              src={posterUrl}
              alt={posterAlt?.trim() || title}
              className="mx-auto h-auto max-h-[min(40vh,22rem)] w-full object-contain"
            />
          </div>
        ) : null}

        <div className="public-form-section public-form-section-delay rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] sm:px-10">
          {!purpose ? (
            <h1 className="text-xl font-bold text-primary sm:text-2xl">{title}</h1>
          ) : null}
          <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-muted">
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
  const canonical = getPublicFormCanonical(slug);

  if (!result.ok) {
    const title = result.meta?.title?.trim() || "فرم در دسترس نیست";
    const description =
      result.meta?.description?.trim() ||
      result.message ||
      "این فرم در حال حاضر برای ثبت‌نام عمومی فعال نیست.";
    const poster = result.meta?.poster?.publicUrl;

    return {
      title,
      description,
      metadataBase: new URL(PUBLIC_SITE_ORIGIN),
      alternates: { canonical },
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "ستارگان پلاس",
        locale: "fa_IR",
        type: "website",
        ...(poster
          ? {
              images: [
                {
                  url: poster.startsWith("http")
                    ? poster
                    : `${PUBLIC_SITE_ORIGIN}${poster}`,
                  alt: title,
                },
              ],
            }
          : {}),
      },
    };
  }

  const title = result.data.version.title;
  const description =
    result.data.version.description?.trim() ||
    `فرم «${title}» در ستارگان پلاس`;
  const poster = result.data.poster?.publicUrl;

  return {
    title,
    description,
    metadataBase: new URL(PUBLIC_SITE_ORIGIN),
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "ستارگان پلاس",
      locale: "fa_IR",
      type: "website",
      ...(poster
        ? {
            images: [
              {
                url: poster.startsWith("http")
                  ? poster
                  : `${PUBLIC_SITE_ORIGIN}${poster}`,
                alt: result.data.poster?.altText?.trim() || title,
              },
            ],
          }
        : {}),
    },
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
        status="UNPUBLISHED_OR_PAUSED"
      />
    );
  }

  if (!result.ok && result.reason === "not_open_yet") {
    return (
      <UnavailableState
        title={result.meta?.title ?? "ثبت‌نام هنوز آغاز نشده"}
        description={result.message ?? AVAILABILITY_MESSAGES.NOT_OPEN_YET}
        purpose={result.meta?.purpose}
        posterUrl={result.meta?.poster?.publicUrl}
        posterAlt={result.meta?.poster?.altText}
        status={result.meta?.status ?? "NOT_OPEN_YET"}
        capacity={result.meta?.capacity}
        remainingCapacity={result.meta?.remainingCapacity}
        showRemainingCapacity={result.meta?.showRemainingCapacity}
        registrationDeadline={result.meta?.registrationDeadline}
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
        purpose={result.meta?.purpose}
        posterUrl={result.meta?.poster?.publicUrl}
        posterAlt={result.meta?.poster?.altText}
        status={result.meta?.status ?? "CLOSED_BY_DEADLINE"}
        capacity={result.meta?.capacity}
        remainingCapacity={result.meta?.remainingCapacity}
        showRemainingCapacity={result.meta?.showRemainingCapacity}
        registrationDeadline={result.meta?.registrationDeadline}
      />
    );
  }

  if (!result.ok && result.reason === "capacity_full") {
    return (
      <UnavailableState
        title={result.meta?.title ?? "ظرفیت تکمیل شده"}
        description={result.message ?? AVAILABILITY_MESSAGES.CAPACITY_FULL}
        purpose={result.meta?.purpose}
        posterUrl={result.meta?.poster?.publicUrl}
        posterAlt={result.meta?.poster?.altText}
        status={result.meta?.status ?? "CAPACITY_FULL"}
        capacity={result.meta?.capacity}
        remainingCapacity={result.meta?.remainingCapacity}
        showRemainingCapacity={result.meta?.showRemainingCapacity}
        registrationDeadline={result.meta?.registrationDeadline}
      />
    );
  }

  if (!result.ok) {
    return (
      <UnavailableState
        title="این فرم اکنون فعال نیست"
        description="ثبت‌نام از طریق این آدرس متوقف شده یا هنوز منتشر نشده است. در صورت نیاز با مرکز آموزشی تماس بگیرید."
        status="UNPUBLISHED_OR_PAUSED"
      />
    );
  }

  const { form, version, fields, poster, availability } = result.data;
  const hasRequired = fields.some(
    (field) =>
      field.required && field.type !== FormFieldType.INFORMATIONAL,
  );

  return (
    <PublicFormShell>
      <article className="space-y-8">
        <PublicFormHeader
          title={version.title}
          description={version.description}
          purpose={form.purpose}
          posterUrl={poster?.publicUrl}
          posterAlt={poster?.altText}
          status={availability.status}
          capacity={version.capacity}
          remainingCapacity={availability.remainingCapacity}
          showRemainingCapacity={availability.showRemainingCapacity}
          registrationDeadline={version.registrationDeadline}
          showRequiredHint={hasRequired}
        />

        <section
          aria-label="فرم"
          className="public-form-section public-form-section-delay rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:p-8"
        >
          <PublicForm data={result.data} />
        </section>
      </article>
    </PublicFormShell>
  );
}
