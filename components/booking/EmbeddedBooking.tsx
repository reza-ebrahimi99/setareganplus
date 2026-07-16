import Link from "next/link";
import { loadPublicBookingService } from "@/lib/booking/load-public-service";

export type EmbeddedBookingDisplayMode = "card" | "compact" | "full";

export type EmbeddedBookingProps = {
  serviceSlug: string;
  displayMode?: EmbeddedBookingDisplayMode;
  buttonText?: string;
  className?: string;
};

/**
 * Premium CTA into the real public booking flow.
 * Does not duplicate slot generation or reservation logic.
 */
export async function EmbeddedBooking({
  serviceSlug,
  displayMode = "card",
  buttonText = "رزرو نوبت مشاوره",
  className,
}: EmbeddedBookingProps) {
  const trimmed = serviceSlug.trim();
  if (!trimmed) {
    return (
      <div
        role="status"
        className={`rounded-2xl border border-border bg-surface px-5 py-6 text-sm leading-7 text-muted ${className ?? ""}`}
      >
        خدمت نوبت‌دهی پیکربندی نشده است.
      </div>
    );
  }

  const result = await loadPublicBookingService(trimmed);

  if (!result.ok) {
    return (
      <div
        role="status"
        className={`rounded-2xl border border-border bg-surface px-5 py-6 text-center ${className ?? ""}`}
      >
        <p className="text-base font-semibold text-primary">
          رزرو آنلاین موقتاً در دسترس نیست
        </p>
        <p className="mt-2 text-sm leading-7 text-muted">
          خدمت انتخاب‌شده فعال نیست یا یافت نشد. از صفحه تماس کمک بگیرید.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background"
        >
          تماس
        </Link>
      </div>
    );
  }

  const { service } = result.data;
  const href = `/book/${service.slug}`;
  const compact = displayMode === "compact";

  return (
    <section
      aria-label={`رزرو ${service.title}`}
      className={`rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] ${
        compact ? "px-4 py-4" : "px-5 py-6 sm:px-7 sm:py-7"
      } ${className ?? ""}`}
    >
      <div className={`flex flex-col gap-4 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}>
        <div className="min-w-0 space-y-2">
          <h2
            className={`font-semibold text-primary ${
              compact ? "text-base" : "text-lg sm:text-xl"
            }`}
          >
            {service.title}
          </h2>
          {service.description && displayMode !== "compact" ? (
            <p className="max-w-xl text-sm leading-7 text-muted">
              {service.description}
            </p>
          ) : null}
          {displayMode === "full" ? (
            <p className="text-xs text-muted">
              مدت هر جلسه: {service.durationMinutes} دقیقه
            </p>
          ) : null}
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
