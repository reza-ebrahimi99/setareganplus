import Link from "next/link";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { timelineEventTone, timelineEventToneLabel } from "@/lib/sxp/engine/event-presentation";

type ExperienceFeedItem = {
  id: string;
  title: string;
  summary: string | null;
  occurredAt: Date;
  eventType: string;
};

type ExperienceFeedListProps = {
  items: ExperienceFeedItem[];
  timelineHref: string;
};

export function ExperienceFeedList({ items, timelineHref }: ExperienceFeedListProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-primary">تازه‌ها</h2>
        <Link
          href={timelineHref}
          className="text-sm font-medium text-secondary underline-offset-2 hover:underline"
        >
          همه روند
        </Link>
      </div>
      {items.length === 0 ? (
        <PortalEmptyState
          title="خوراک خالی است"
          description="وقتی ماژول رویداد بفرستد اینجا می‌آید."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="admin-card p-4">
              <p className="text-[11px] font-medium text-muted">
                {timelineEventToneLabel(timelineEventTone(item.eventType))}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">{item.title}</p>
              {item.summary ? (
                <p className="mt-1 text-xs text-muted">{item.summary}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {formatJalaliDateShort(item.occurredAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
