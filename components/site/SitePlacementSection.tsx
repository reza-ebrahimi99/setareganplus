import { EmbeddedBooking } from "@/components/booking/EmbeddedBooking";
import { EmbeddedPublicForm } from "@/components/forms/EmbeddedPublicForm";
import { ContentCard } from "@/components/ui/ContentCard";
import type { ResolvedSitePlacement } from "@/lib/site/load-site-placement";

type SitePlacementSectionProps = {
  placement: ResolvedSitePlacement;
  sectionId: string;
  fallbackHeading: string;
  instanceId: string;
  /** When true, show a notice card for unset/env-missing (pre-registration). */
  showUnsetNotice?: boolean;
  unsetNoticeBody?: string;
};

/**
 * Renders a resolved form/booking placement or a safe Persian fallback.
 */
export function SitePlacementSection({
  placement,
  sectionId,
  fallbackHeading,
  instanceId,
  showUnsetNotice = false,
  unsetNoticeBody,
}: SitePlacementSectionProps) {
  if (placement.kind === "none") {
    if (placement.reason === "disabled") {
      return null;
    }
    if (placement.reason === "invalid" && placement.warning) {
      return (
        <section id={sectionId} className="scroll-mt-24">
          <ContentCard
            heading={fallbackHeading}
            body={placement.warning}
            variant="notice"
          />
        </section>
      );
    }
    if (showUnsetNotice && placement.reason === "unset") {
      return (
        <section id={sectionId} className="scroll-mt-24">
          <ContentCard
            heading={fallbackHeading}
            body={
              unsetNoticeBody ??
              "محتوای آنلاین این بخش هنوز در پنل مدیریت تنظیم نشده است."
            }
            variant="notice"
          />
        </section>
      );
    }
    return null;
  }

  const heading =
    placement.heading?.trim() ||
    (placement.kind === "form"
      ? fallbackHeading
      : fallbackHeading);

  return (
    <section id={sectionId} className="scroll-mt-24 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-primary">{heading}</h2>
        {placement.description?.trim() ? (
          <p className="text-sm leading-7 text-muted">
            {placement.description.trim()}
          </p>
        ) : null}
      </div>

      {placement.kind === "form" ? (
        <EmbeddedPublicForm
          slug={placement.slug}
          displayMode={placement.displayMode}
          showPoster={placement.showPoster}
          showTitle={!placement.heading?.trim()}
          instanceId={instanceId}
        />
      ) : (
        <EmbeddedBooking
          serviceSlug={placement.slug}
          displayMode={placement.displayMode}
          buttonText={placement.ctaLabel?.trim() || "رزرو نوبت"}
        />
      )}
    </section>
  );
}
