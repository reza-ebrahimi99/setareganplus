import Link from "next/link";
import { FormFieldType } from "@/generated/prisma/enums";
import { PublicFormEntry } from "@/components/forms/PublicFormEntry";
import { AVAILABILITY_MESSAGES } from "@/lib/forms/evaluate-form-availability";
import { getFormPurposeLabel } from "@/lib/forms/form-purpose-labels";
import {
  loadPublicFormBySlug,
  type PublicFormPoster,
} from "@/lib/forms/load-public-form";

export type EmbeddedPublicFormDisplayMode = "full" | "embedded" | "compact";

export type EmbeddedPublicFormProps = {
  slug: string;
  displayMode?: EmbeddedPublicFormDisplayMode;
  showPoster?: boolean;
  showTitle?: boolean;
  instanceId?: string;
  className?: string;
};

function FallbackCard({
  title,
  description,
  poster,
}: {
  title: string;
  description: string;
  poster?: PublicFormPoster | null;
}) {
  return (
    <div className="space-y-4">
      {poster ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element -- Nginx /media */}
          <img
            src={poster.publicUrl}
            alt={poster.altText?.trim() || title}
            className="mx-auto h-auto max-h-48 w-full object-contain"
          />
        </div>
      ) : null}
      <div
        role="status"
        className="rounded-2xl border border-border bg-surface px-5 py-8 text-center"
      >
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted">
          {description}
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background"
        >
          تماس با مرکز
        </Link>
      </div>
    </div>
  );
}

/**
 * Reusable published-form embed — same loader, renderer, and submission action
 * as /forms/[slug]. Never loads draft data.
 */
export async function EmbeddedPublicForm({
  slug,
  displayMode = "embedded",
  showPoster = false,
  showTitle = true,
  instanceId,
  className,
}: EmbeddedPublicFormProps) {
  const trimmed = slug.trim();
  if (!trimmed) {
    return (
      <FallbackCard
        title="فرم در دسترس نیست"
        description="شناسه فرم پیکربندی نشده است. لطفاً بعداً دوباره تلاش کنید."
      />
    );
  }

  const result = await loadPublicFormBySlug(trimmed);

  if (!result.ok) {
    const title = result.meta?.title ?? "فرم در دسترس نیست";
    const description =
      result.message ??
      (result.reason === "not_open_yet"
        ? AVAILABILITY_MESSAGES.NOT_OPEN_YET
        : result.reason === "closed"
          ? AVAILABILITY_MESSAGES.CLOSED_BY_DEADLINE
          : result.reason === "capacity_full"
            ? AVAILABILITY_MESSAGES.CAPACITY_FULL
            : result.reason === "org_unavailable"
              ? "سامانه موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید."
              : "این فرم در حال حاضر برای ثبت‌نام عمومی فعال نیست.");

    return (
      <FallbackCard
        title={title}
        description={description}
        poster={showPoster ? result.meta?.poster : null}
      />
    );
  }

  const { data } = result;
  const compact = displayMode === "compact";
  const hasRequired = data.fields.some(
    (field) => field.required && field.type !== FormFieldType.INFORMATIONAL,
  );

  return (
    <div className={className ?? "space-y-5"}>
      {showPoster && data.poster ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Nginx /media */}
          <img
            src={data.poster.publicUrl}
            alt={data.poster.altText?.trim() || data.version.title}
            className={`mx-auto h-auto w-full object-contain ${
              compact ? "max-h-40" : "max-h-[min(40vh,20rem)]"
            }`}
          />
        </div>
      ) : null}

      {showTitle ? (
        <header className={`space-y-2 ${compact ? "" : "sm:text-start"} text-center`}>
          {displayMode === "full" ? (
            <p className="inline-flex rounded-full bg-secondary/15 px-3 py-1 text-[11px] font-medium text-primary">
              {getFormPurposeLabel(data.form.purpose)}
            </p>
          ) : null}
          <h2
            className={`font-bold text-primary ${
              compact ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            {data.version.title}
          </h2>
          {data.version.description && displayMode !== "compact" ? (
            <p className="max-w-2xl text-sm leading-7 text-muted">
              {data.version.description}
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
      ) : null}

      <section
        aria-label="فرم"
        className={`rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] ${
          compact ? "p-4" : "p-5 sm:p-7"
        }`}
      >
        <PublicFormEntry
          data={data}
          displayMode={displayMode}
          instanceId={instanceId ?? `embed-${data.form.slug}`}
        />
      </section>
    </div>
  );
}
