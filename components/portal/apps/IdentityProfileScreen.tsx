import Image from "next/image";
import { PortalWidget } from "@/components/portal/PortalWidget";
import { PortalModuleShell } from "@/components/portal/apps/PortalModuleShell";
import { toPersianDigits } from "@/lib/persian";
import type { PortalStudentProfileDto } from "@/lib/portal/student/profile";
import type { ExperienceProfileDto } from "@/lib/sxp/hub/load-profile";

type IdentityProfileScreenProps = {
  profile: PortalStudentProfileDto;
  organizationName: string;
  userDisplayName: string;
  experience: ExperienceProfileDto | null;
};

function profileCompletion(profile: PortalStudentProfileDto): number {
  const checks = [
    Boolean(profile.studentName),
    Boolean(profile.gradeName),
    Boolean(profile.schoolYear),
    Boolean(profile.portraitUrl),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function IdentityProfileScreen({
  profile,
  organizationName,
  userDisplayName,
  experience,
}: IdentityProfileScreenProps) {
  const completion = profileCompletion(profile);

  return (
    <PortalModuleShell
      hero={{
        eyebrow: "هویت من",
        title: profile.studentName,
        subtitle: "کارت هویت تحصیلی تو در ستارگان پلاس — خلاصه، امن و خوانا.",
        icon: "user",
        accent: "teal",
        status: `تکمیل ${toPersianDigits(completion)}٪`,
        primaryCta: {
          href: "/portal/student/assessments",
          label: "سوابق آزمون",
        },
        secondaryCta: {
          href: "/portal/student/achievements",
          label: "افتخارات",
        },
      }}
      actions={[
        {
          id: "assessments",
          href: "/portal/student/assessments",
          label: "آزمون‌ها",
          description: "کارنامه من",
          icon: "chart",
          accent: "blue",
        },
        {
          id: "achievements",
          href: "/portal/student/achievements",
          label: "افتخارات",
          description: "مدال‌ها",
          icon: "trophy",
          accent: "orange",
        },
        {
          id: "home",
          href: "/portal/student",
          label: "خانه",
          description: "بازگشت",
          icon: "home",
          accent: "gold",
        },
      ]}
      stickyCta={{ href: "/portal/student", label: "خانه پرتال" }}
      sidebar={
        <>
          <PortalWidget
            id="profile-completion"
            module="generic"
            title="تکمیل پروفایل"
            icon="layers"
            accent="teal"
          >
            <p className="portal-stat-xl">{toPersianDigits(completion)}٪</p>
            <p className="portal-sidebar-stack__meta">
              بر اساس نام، پایه، سال و تصویر
            </p>
          </PortalWidget>
          <PortalWidget
            id="account-status"
            module="generic"
            title="وضعیت حساب"
            icon="shield"
            accent="emerald"
          >
            <p className="portal-sidebar-stack__title">پرتال دانش‌آموز فعال</p>
            <p className="portal-sidebar-stack__meta">{organizationName}</p>
          </PortalWidget>
          <PortalWidget
            id="security"
            module="generic"
            title="امنیت حساب"
            icon="shield"
            accent="purple"
            empty
            emptyTitle="تنظیمات امنیتی به‌زودی"
            emptyDescription="مدیریت نشست و هشدارها در فازهای بعدی همین‌جا می‌آید."
          />
        </>
      }
    >
      <div className="portal-module-stack">
        <PortalWidget
          id="profile-hero-card"
          module="generic"
          title="کارت هویت"
          icon="user"
          accent="teal"
        >
          <div className="portal-identity-card">
            <div className="portal-identity-card__avatar">
              {profile.portraitUrl ? (
                <Image
                  src={profile.portraitUrl}
                  alt={profile.studentName}
                  fill
                  unoptimized
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <span>{profile.studentName.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <p className="portal-identity-card__name">{profile.studentName}</p>
              <p className="portal-identity-card__meta">
                {[profile.gradeName, profile.schoolYear]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </PortalWidget>

        <PortalWidget
          id="academic-summary"
          module="generic"
          title="خلاصه تحصیلی"
          icon="book"
          accent="blue"
        >
          <dl className="portal-info-grid">
            <div>
              <dt>پایه</dt>
              <dd>{profile.gradeName}</dd>
            </div>
            <div>
              <dt>سال تحصیلی</dt>
              <dd>{profile.schoolYear ?? "ثبت نشده"}</dd>
            </div>
            <div>
              <dt>نام نمایشی پرتال</dt>
              <dd>{userDisplayName}</dd>
            </div>
            <div>
              <dt>سازمان</dt>
              <dd>{organizationName}</dd>
            </div>
          </dl>
        </PortalWidget>

        <PortalWidget
          id="personal-info"
          module="generic"
          title="اطلاعات فردی"
          icon="clipboard"
          accent="gold"
        >
          <dl className="portal-info-grid">
            <div>
              <dt>نام کامل</dt>
              <dd>{profile.studentName}</dd>
            </div>
            <div>
              <dt>شناسه عمومی</dt>
              <dd dir="ltr">{profile.studentSlug}</dd>
            </div>
          </dl>
        </PortalWidget>

        <PortalWidget
          id="guardian-info"
          module="generic"
          title="اطلاعات ولی"
          icon="users"
          accent="pink"
          empty
          emptyTitle="اطلاعات ولی هنوز اینجا نیست"
          emptyDescription="وقتی پیوند ولی در پرتال در دسترس باشد، خلاصه امن آن نمایش داده می‌شود."
        />

        {experience ? (
          <PortalWidget
            id="experience-strip"
            module="modules"
            title="پروفایل تجربه"
            icon="spark"
            accent="purple"
          >
            <dl className="portal-info-grid">
              <div>
                <dt>نام نمایشی تجربه</dt>
                <dd>{experience.displayName}</dd>
              </div>
              <div>
                <dt>علاقه‌مندی‌ها</dt>
                <dd>
                  {experience.interests?.trim()
                    ? experience.interests
                    : "هنوز ثبت نشده"}
                </dd>
              </div>
            </dl>
          </PortalWidget>
        ) : null}
      </div>
    </PortalModuleShell>
  );
}
