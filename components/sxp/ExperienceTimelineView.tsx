import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import type { ExperienceTimelineDto } from "@/lib/sxp/hub/load-timeline";

type ExperienceTimelineViewProps = {
  timeline: ExperienceTimelineDto;
};

export function ExperienceTimelineView({ timeline }: ExperienceTimelineViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">روند</h1>
        <p className="mt-1 text-sm text-muted">
          تاریخچه رویدادهای حساب {timeline.displayName}
        </p>
      </div>

      {timeline.items.length === 0 ? (
        <PortalEmptyState
          title="هنوز رویدادی نیست"
          description="رزرو، فرم و پیامک‌های حساب شما پس از پردازش موتور تجربه اینجا می‌آیند."
        />
      ) : (
        <ol className="space-y-3">
          {timeline.items.map((item) => (
            <li key={item.id} className="admin-card p-4">
              <p className="text-sm font-semibold text-primary">{item.title}</p>
              {item.summary ? (
                <p className="mt-1 text-sm text-muted">{item.summary}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {formatJalaliDateShort(item.occurredAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
