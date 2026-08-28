import Link from "next/link";
import { ExperienceWidgetKey } from "@/generated/prisma/enums";
import { toPersianDigits } from "@/lib/persian";
import type { ExperienceHomeWidget } from "@/lib/sxp/hub/load-home";
import type { WidgetPayload } from "@/lib/sxp/engine/widgets";

const WIDGET_LABELS: Record<ExperienceWidgetKey, string> = {
  NEXT_ACTION: "اقدام بعدی",
  UPCOMING_RESERVATION: "رزرو پیش‌رو",
  OPEN_BALANCE: "مانده حساب",
  LOYALTY_CHIP: "امتیاز",
  READY_PICKUP: "آماده تحویل",
  RECENT_FEED: "تازه‌ها",
  FILES_READY: "فایل‌ها",
};

function widgetHref(
  key: ExperienceWidgetKey,
  hrefs: { timelineHref: string; filesHref: string; filesEnabled: boolean },
): string | null {
  if (key === ExperienceWidgetKey.FILES_READY) {
    return hrefs.filesEnabled ? hrefs.filesHref : null;
  }
  if (
    key === ExperienceWidgetKey.NEXT_ACTION ||
    key === ExperienceWidgetKey.UPCOMING_RESERVATION ||
    key === ExperienceWidgetKey.RECENT_FEED
  ) {
    return hrefs.timelineHref;
  }
  return null;
}

function widgetBody(payload: WidgetPayload): string {
  if (payload.empty) {
    return payload.reason === "phase_s1_unavailable"
      ? "به‌زودی"
      : "هنوز موردی نیست";
  }
  if ("count" in payload) {
    return `${toPersianDigits(payload.count)} فایل آماده`;
  }
  if ("label" in payload) return payload.label;
  if ("title" in payload) {
    return payload.trackingCode
      ? `${payload.title} · ${payload.trackingCode}`
      : payload.title;
  }
  if ("items" in payload) {
    return payload.items[0]?.title ?? "فعلاً خالی است";
  }
  return "—";
}

type ExperienceWidgetGridProps = {
  widgets: ExperienceHomeWidget[];
  timelineHref: string;
  filesHref: string;
  filesEnabled: boolean;
};

export function ExperienceWidgetGrid({
  widgets,
  timelineHref,
  filesHref,
  filesEnabled,
}: ExperienceWidgetGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((widget) => {
        const href = widgetHref(widget.key, {
          timelineHref,
          filesHref,
          filesEnabled,
        });
        const body = widgetBody(widget.payload);
        const className =
          "admin-card block min-h-[7rem] p-4 transition hover:border-secondary/40";
        const inner = (
          <>
            <p className="text-xs text-muted">{WIDGET_LABELS[widget.key]}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-primary">
              {body}
            </p>
            {widget.payload.empty ? (
              <p className="mt-2 text-[11px] leading-5 text-muted">
                وقتی ماژول رویداد بفرستد اینجا می‌آید
              </p>
            ) : null}
          </>
        );

        if (!href) {
          return (
            <div key={widget.key} className={className}>
              {inner}
            </div>
          );
        }

        return (
          <Link key={widget.key} href={href} className={className}>
            {inner}
          </Link>
        );
      })}
    </section>
  );
}
