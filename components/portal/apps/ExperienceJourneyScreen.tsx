import Image from "next/image";
import Link from "next/link";
import { ExperienceWidgetKey } from "@/generated/prisma/enums";
import { PortalWidget } from "@/components/portal/PortalWidget";
import { PortalModuleShell } from "@/components/portal/apps/PortalModuleShell";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import type { ExperienceHomeDto } from "@/lib/sxp/hub/load-home";
import type { WidgetPayload } from "@/lib/sxp/engine/widgets";

const WIDGET_LABELS: Record<ExperienceWidgetKey, string> = {
  NEXT_ACTION: "اقدام بعدی",
  UPCOMING_RESERVATION: "رزرو پیش‌رو",
  OPEN_BALANCE: "مانده حساب",
  LOYALTY_CHIP: "امتیاز وفاداری",
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

function isEmptyPayload(payload: WidgetPayload): boolean {
  return "empty" in payload && payload.empty === true;
}

type ExperienceJourneyScreenProps = {
  home: ExperienceHomeDto;
};

/**
 * Experience as a Journey dashboard — Portal OS chrome over existing SXP DTOs.
 * Architecture supports future gamification (level/XP/streak) without inventing values today.
 */
export function ExperienceJourneyScreen({ home }: ExperienceJourneyScreenProps) {
  const loyalty = home.widgets.find(
    (widget) => widget.key === ExperienceWidgetKey.LOYALTY_CHIP,
  );
  const nextAction = home.widgets.find(
    (widget) => widget.key === ExperienceWidgetKey.NEXT_ACTION,
  );
  const name = home.studentName ?? home.displayName;

  return (
    <PortalModuleShell
      hero={{
        eyebrow: "خانه تجربه",
        title: `سلام ${name.split(/\s+/)[0] ?? name}`,
        subtitle:
          "داشبورد تجربه ستارگان — فعالیت‌ها، پاداش‌ها و قدم بعدی مسیر.",
        icon: "spark",
        accent: "purple",
        status: home.organizationName,
        primaryCta: {
          href: "/portal/student/timeline",
          label: "مشاهده روند",
        },
        secondaryCta: { href: "/portal/student", label: "خانه پرتال" },
      }}
      actions={home.quickActions.slice(0, 4).map((action, index) => ({
        id: action.code,
        href: action.href,
        label: action.label,
        description: "اقدام تجربه",
        icon:
          index === 0
            ? ("spark" as const)
            : index === 1
              ? ("calendar" as const)
              : ("layers" as const),
        accent:
          index === 0
            ? ("purple" as const)
            : index === 1
              ? ("orange" as const)
              : ("teal" as const),
      }))}
      stickyCta={{
        href: "/portal/student/timeline",
        label: "روند تجربه",
      }}
      sidebar={
        <>
          <PortalWidget
            id="xp-level"
            module="modules"
            title="سطح تجربه"
            icon="trophy"
            accent="purple"
            empty
            emptyTitle="سطح‌بندی به‌زودی"
            emptyDescription="معماری آماده است؛ عدد سطح وقتی موتور امتیاز فعال شود اینجا می‌آید."
          />
          <PortalWidget
            id="xp-points"
            module="modules"
            title="امتیاز"
            icon="spark"
            accent="gold"
            empty={!loyalty || isEmptyPayload(loyalty.payload)}
            emptyTitle="امتیازی ثبت نشده"
            emptyDescription="امتیاز وفاداری وقتی داده واقعی باشد نمایش داده می‌شود."
          >
            {loyalty && !isEmptyPayload(loyalty.payload) ? (
              <p className="portal-sidebar-stack__title">
                {widgetBody(loyalty.payload)}
              </p>
            ) : null}
          </PortalWidget>
          <PortalWidget
            id="next-reward"
            module="modules"
            title="پاداش بعدی"
            icon="medal"
            accent="orange"
            empty
            emptyTitle="پاداش بعدی هنوز مشخص نیست"
            emptyDescription="کارت پاداش وقتی تعریف شود، همین‌جا جای می‌گیرد."
          />
        </>
      }
    >
      <div className="portal-module-stack">
        <PortalWidget
          id="experience-identity"
          module="modules"
          title="پروفایل تجربه"
          icon="user"
          accent="purple"
        >
          <div className="portal-identity-card">
            <div className="portal-identity-card__avatar">
              {home.portraitUrl ? (
                <Image
                  src={home.portraitUrl}
                  alt={name}
                  fill
                  unoptimized
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <span>{name.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <p className="portal-identity-card__name">{name}</p>
              <p className="portal-identity-card__meta">{home.organizationName}</p>
            </div>
          </div>
        </PortalWidget>

        <PortalWidget
          id="experience-widgets"
          module="modules"
          title="ویجت‌های زنده"
          icon="grid"
          accent="teal"
        >
          <ul className="portal-experience-widget-grid">
            {home.widgets.map((widget) => {
              const empty = isEmptyPayload(widget.payload);
              const emptyReason =
                empty && "reason" in widget.payload
                  ? widget.payload.reason
                  : null;
              return (
                <li
                  key={widget.key}
                  className="portal-experience-widget-card"
                  data-portal-accent="purple"
                >
                  <p className="portal-experience-widget-card__label">
                    {WIDGET_LABELS[widget.key]}
                  </p>
                  <p className="portal-experience-widget-card__value">
                    {empty
                      ? emptyReason === "phase_s1_unavailable"
                        ? "به‌زودی"
                        : "خالی و آماده"
                      : widgetBody(widget.payload)}
                  </p>
                </li>
              );
            })}
          </ul>
        </PortalWidget>

        <PortalWidget
          id="streak-architecture"
          module="modules"
          title="روند روزانه"
          icon="calendar"
          accent="orange"
          empty
          emptyTitle="استریک هنوز فعال نیست"
          emptyDescription="معماری برای نمایش تداوم روزانه آماده است — بدون عدد ساختگی."
        />

        <PortalWidget
          id="experience-feed"
          module="activity"
          title="فعالیت‌های اخیر"
          icon="layers"
          accent="blue"
          action={{ href: "/portal/student/timeline", label: "روند کامل" }}
          empty={home.feed.length === 0}
          emptyTitle="هنوز روایتی ثبت نشده"
          emptyDescription="وقتی رزرو یا فرم به حساب وصل شود، خلاصه آن اینجا می‌آید."
        >
          <ul className="portal-activity-list">
            {home.feed.map((item) => (
              <li key={item.id} className="portal-activity-list__item">
                <div className="min-w-0">
                  <p className="portal-activity-list__title">{item.title}</p>
                  {item.summary ? (
                    <p className="portal-activity-list__meta">{item.summary}</p>
                  ) : null}
                  <p className="portal-activity-list__meta">
                    {formatJalaliDateShort(item.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </PortalWidget>

        {nextAction && !isEmptyPayload(nextAction.payload) ? (
          <PortalWidget
            id="reward-cards"
            module="modules"
            title="قدم انگیزشی"
            icon="route"
            accent="gold"
          >
            <div className="portal-reward-card" data-portal-accent="gold">
              <p className="portal-reward-card__title">
                {widgetBody(nextAction.payload)}
              </p>
              <p className="portal-reward-card__support">
                امروز یک حرکت کوچک، مسیر تجربه را جلو می‌برد.
              </p>
              <Link
                href="/portal/student/timeline"
                className="portal-reward-card__cta"
              >
                ادامه در روند
              </Link>
            </div>
          </PortalWidget>
        ) : null}
      </div>
    </PortalModuleShell>
  );
}
