import Image from "next/image";
import Link from "next/link";
import { ExperienceWidgetKey } from "@/generated/prisma/enums";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import type { ExperienceHomeDto } from "@/lib/sxp/hub/load-home";
import type { WidgetPayload } from "@/lib/sxp/engine/widgets";

const WIDGET_LABELS: Record<ExperienceWidgetKey, string> = {
  NEXT_ACTION: "اقدام بعدی",
  UPCOMING_RESERVATION: "رزرو پیش‌رو",
  OPEN_BALANCE: "مانده حساب",
  LOYALTY_CHIP: "امتیاز",
  READY_PICKUP: "آماده تحویل",
  RECENT_FEED: "تازه‌ها",
};

function widgetBody(payload: WidgetPayload): string {
  if (payload.empty) {
    return payload.reason === "phase_s1_unavailable"
      ? "در نسخه‌های بعدی"
      : "هنوز موردی نیست";
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

type ExperienceHomeViewProps = {
  home: ExperienceHomeDto;
};

export function ExperienceHomeView({ home }: ExperienceHomeViewProps) {
  return (
    <div className="space-y-6">
      <section className="admin-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
            {home.portraitUrl ? (
              <Image
                src={home.portraitUrl}
                alt={home.studentName ?? home.displayName}
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg font-semibold text-primary/40">
                {(home.studentName ?? home.displayName).slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">خانه تجربه</p>
            <h1 className="text-xl font-bold text-primary sm:text-2xl">
              {home.studentName ?? home.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted">{home.organizationName}</p>
          </div>
        </div>
      </section>

      {home.quickActions.length > 0 ? (
        <section className="flex flex-wrap gap-2">
          {home.quickActions.map((action) => (
            <Link
              key={action.code}
              href={action.href}
              className="rounded-xl border border-secondary/30 bg-secondary/10 px-3.5 py-2 text-sm font-medium text-primary"
            >
              {action.label}
            </Link>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {home.widgets.map((widget) => (
          <div key={widget.key} className="admin-card p-4">
            <p className="text-xs text-muted">{WIDGET_LABELS[widget.key]}</p>
            <p className="mt-2 text-sm font-semibold text-primary">
              {widgetBody(widget.payload)}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-primary">فعالیت‌های اخیر</h2>
        {home.feed.length === 0 ? (
          <PortalEmptyState
            title="خوراک خالی است"
            description="وقتی رزرو یا فرم به حساب شما وصل شود، خلاصه آن اینجا دیده می‌شود."
          />
        ) : (
          <ul className="space-y-3">
            {home.feed.map((item) => (
              <li key={item.id} className="admin-card p-4">
                <p className="text-sm font-semibold text-primary">{item.title}</p>
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
    </div>
  );
}
