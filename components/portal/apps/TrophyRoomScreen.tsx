import { PortalWidget } from "@/components/portal/PortalWidget";
import { PortalAchievementCard } from "@/components/portal/PortalAchievementCard";
import { PortalModuleShell } from "@/components/portal/apps/PortalModuleShell";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { PortalAchievementDto } from "@/lib/portal/student/achievements";
import type { TrophyRoomInsights } from "@/lib/portal/student/trophy-insights";

type TrophyRoomScreenProps = {
  achievements: readonly PortalAchievementDto[];
  insights: TrophyRoomInsights;
};

export function TrophyRoomScreen({
  achievements,
  insights,
}: TrophyRoomScreenProps) {
  const empty = achievements.length === 0;

  return (
    <PortalModuleShell
      hero={{
        eyebrow: "اتاق افتخارات",
        title: empty ? "اتاق مدال‌ها منتظر توست" : "اتاق افتخارات تو",
        subtitle: empty
          ? "وقتی مدرسه افتخاری منتشر کند، مدال‌ها و نقاط عطف اینجا می‌درخشند."
          : "مدال‌ها، نقاط عطف و داستان موفقیت‌های ثبت‌شده — مثل یک تالار افتخار.",
        icon: "trophy",
        accent: "orange",
        status: empty
          ? "هنوز خالی"
          : `${toPersianDigits(insights.total)} افتخار`,
        primaryCta: {
          href: "/portal/student/assessments",
          label: "مشاهده آزمون‌ها",
        },
        secondaryCta: { href: "/portal/student", label: "خانه" },
      }}
      actions={[
        {
          id: "assessments",
          href: "/portal/student/assessments",
          label: "آزمون‌ها",
          description: "مرکز ارزیابی",
          icon: "chart",
          accent: "blue",
        },
        {
          id: "home",
          href: "/portal/student",
          label: "خانه",
          description: "خلاصه مسیر",
          icon: "home",
          accent: "gold",
        },
        {
          id: "profile",
          href: "/portal/student/profile",
          label: "پروفایل",
          description: "هویت من",
          icon: "user",
          accent: "teal",
        },
      ]}
      stickyCta={
        insights.featured?.certificateUrl
          ? {
              href: insights.featured.certificateUrl,
              label: "مشاهده گواهی ویژه",
            }
          : { href: "/portal/student", label: "خانه پرتال" }
      }
      sidebar={
        <>
          <PortalWidget
            id="badge-total"
            module="achievements"
            title="مجموع مدال‌ها"
            icon="trophy"
            accent="orange"
            empty={empty}
            emptyTitle="هنوز مدالی نیست"
            emptyDescription="اولین افتخار، شمارنده را روشن می‌کند."
          >
            <p className="portal-stat-xl">{toPersianDigits(insights.total)}</p>
          </PortalWidget>
          <PortalWidget
            id="latest-unlock"
            module="achievements"
            title="آخرین باز شدن"
            icon="medal"
            accent="gold"
            empty={!insights.featured}
            emptyTitle="قفل‌گشایی ثبت نشده"
            emptyDescription="جدیدترین افتخار اینجا دیده می‌شود."
          >
            {insights.featured ? (
              <div className="portal-sidebar-stack">
                <p className="portal-sidebar-stack__title">
                  {insights.featured.title}
                </p>
                <p className="portal-sidebar-stack__meta">
                  {insights.featured.achievementDate
                    ? formatJalaliDateShort(insights.featured.achievementDate)
                    : insights.featured.categoryName}
                </p>
              </div>
            ) : null}
          </PortalWidget>
          <PortalWidget
            id="certificate-count"
            module="achievements"
            title="گواهی‌ها"
            icon="clipboard"
            accent="teal"
            empty={insights.withCertificate === 0}
            emptyTitle="گواهی آماده‌ای نیست"
            emptyDescription="اگر گواهی منتشر شود، تعداد اینجا می‌آید."
          >
            <p className="portal-stat-xl">
              {toPersianDigits(insights.withCertificate)}
            </p>
          </PortalWidget>
        </>
      }
    >
      <div className="portal-module-stack">
        <PortalWidget
          id="featured-achievement"
          module="achievements"
          title="افتخار ویژه"
          icon="spark"
          accent="orange"
          empty={!insights.featured}
          emptyTitle="هنوز ستاره‌ای انتخاب نشده"
          emptyDescription="اولین افتخار منتشرشده، ویترین ویژه را می‌سازد."
        >
          {insights.featured ? (
            <PortalAchievementCard
              achievement={insights.featured}
              priority
              featured
            />
          ) : null}
        </PortalWidget>

        <PortalWidget
          id="recent-badges"
          module="achievements"
          title="مدال‌های اخیر"
          icon="medal"
          accent="gold"
          empty={insights.recent.length === 0}
          emptyTitle="مدال تازه‌ای نیست"
          emptyDescription="مدال‌های بعدی کنار افتخار ویژه چیده می‌شوند."
        >
          <div className="portal-trophy-grid">
            {insights.recent.map((achievement) => (
              <PortalAchievementCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        </PortalWidget>

        <PortalWidget
          id="milestones"
          module="achievements"
          title="نقاط عطف"
          icon="layers"
          accent="purple"
          empty={insights.categories.length === 0}
          emptyTitle="دسته‌بندی هنوز خالی است"
          emptyDescription="با تنوع افتخارات، نقاط عطف دسته‌ای اینجا شکل می‌گیرد."
        >
          <ul className="portal-milestone-list">
            {insights.categories.map((category) => (
              <li key={category.name} className="portal-milestone-list__item">
                <span>{category.name}</span>
                <strong>{toPersianDigits(category.count)}</strong>
              </li>
            ))}
          </ul>
        </PortalWidget>

        <PortalWidget
          id="achievement-timeline"
          module="achievements"
          title="خط زمان افتخارات"
          icon="calendar"
          accent="teal"
          empty={achievements.length === 0}
          emptyTitle="خط زمان منتظر اولین نقطه است"
          emptyDescription="تاریخ افتخارات به‌ترتیب اینجا روایت می‌شود."
        >
          <ol className="portal-trophy-timeline">
            {achievements.map((achievement) => (
              <li key={achievement.id}>
                <span className="portal-trophy-timeline__dot" aria-hidden="true" />
                <div>
                  <p className="portal-trophy-timeline__title">
                    {achievement.title}
                  </p>
                  <p className="portal-trophy-timeline__meta">
                    {[
                      achievement.categoryName,
                      achievement.achievementDate
                        ? formatJalaliDateShort(achievement.achievementDate)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </PortalWidget>
      </div>
    </PortalModuleShell>
  );
}
