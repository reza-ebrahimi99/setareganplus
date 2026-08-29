/**
 * Guidance Platform — Major Selection OS home.
 * Presentation + view routing only. Reuses existing models / loaders / actions.
 *
 * Views (existing route + ?view=):
 *   (default) dashboard | case | journey | analysis | interest | profile
 *   counselor | sessions | documents | messages | settings
 *   majors | universities | selection  (architecture placeholders)
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceAnalysisScreen } from "@/components/guidance/analysis/GuidanceAnalysisScreen";
import { InterestDiscoveryScreen } from "@/components/guidance/interest/InterestDiscoveryScreen";
import { Student360ProfileScreen } from "@/components/guidance/profile360/Student360ProfileScreen";
import { GuidanceCaseScreen } from "@/components/guidance/platform/GuidanceCaseScreen";
import { GuidancePlatformDashboard } from "@/components/guidance/platform/GuidancePlatformDashboard";
import { GuidancePlatformPlaceholder } from "@/components/guidance/platform/GuidancePlatformPlaceholder";
import { PortalJourneyHeroBanner } from "@/components/portal/journey/PortalJourneyHero";
import { PortalJourneyScreen } from "@/components/portal/journey/PortalJourneyScreen";
import { buildAnalysisPresentationModel } from "@/lib/guidance/analysis";
import {
  buildGuidanceJourneyModel,
  buildGuidanceEmptyJourneyHero,
} from "@/lib/guidance/journey-presentation";
import {
  buildInterestAssessmentPresentationModel,
  loadGuidanceInterestSession,
} from "@/lib/guidance/interest";
import {
  buildStudentProfilePresentationModel,
  isProfile360JourneyComplete,
  loadGuidanceProfile360Session,
} from "@/lib/guidance/profile360";
import { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";
import type { PortalIconName } from "@/components/portal/icons";

export const dynamic = "force-dynamic";

type GuidancePortalServicePageProps = {
  searchParams?: Promise<{ view?: string }>;
};

type PlaceholderView =
  | "counselor"
  | "sessions"
  | "documents"
  | "messages"
  | "settings"
  | "majors"
  | "universities"
  | "selection";

const PLACEHOLDERS: Record<
  PlaceholderView,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: PortalIconName;
    accent: string;
  }
> = {
  counselor: {
    eyebrow: "همراهی",
    title: "مشاور من",
    description:
      "فضای اختصاصی مشاور آماده است. تخصیص مشاور و گفت‌وگو در فازهای بعدی فعال می‌شود — بدون تغییر منطق فعلی.",
    icon: "users",
    accent: "blue",
  },
  sessions: {
    eyebrow: "جلسات",
    title: "جلسات مشاوره",
    description:
      "رزرو و مدیریت جلسات به‌صورت معماری آماده شده. رزرو واقعی از مسیر سفر هدایت در زمان مناسب باز می‌شود.",
    icon: "calendar",
    accent: "orange",
  },
  documents: {
    eyebrow: "مدارک",
    title: "مدارک پرونده",
    description:
      "کارنامه، سهمیه، کارت ملی و سایر مدارک اینجا جمع می‌شوند. فعلاً بارگذاری کارنامه از مسیر سفر در دسترس است.",
    icon: "book",
    accent: "teal",
  },
  messages: {
    eyebrow: "ارتباط",
    title: "پیام‌های مشاور",
    description:
      "صندوق پیام مشاور به‌زودی فعال می‌شود. تا آن زمان وضعیت پرونده را از داشبورد و سفر هدایت پیگیری کن.",
    icon: "message",
    accent: "purple",
  },
  settings: {
    eyebrow: "تنظیمات",
    title: "تنظیمات سامانه انتخاب رشته",
    description:
      "ترجیحات اعلان و نمایش در این سامانه. برای بازگشت به پرتال دانش‌آموز از لینک زیر استفاده کن.",
    icon: "panel",
    accent: "purple",
  },
  majors: {
    eyebrow: "به‌زودی",
    title: "رشته‌های پیشنهادی",
    description:
      "پس از تکمیل تحلیل، رغبت و پروفایل ۳۶۰، پیشنهاد رشته‌ها اینجا ظاهر می‌شود. فعلاً فقط معماری.",
    icon: "layers",
    accent: "gold",
  },
  universities: {
    eyebrow: "به‌زودی",
    title: "دانشگاه‌های پیشنهادی",
    description:
      "لیست دانشگاه‌های هم‌راستا با پرونده‌ات در فازهای بعدی. بدون موتور پیشنهاد در این فاز.",
    icon: "grid",
    accent: "blue",
  },
  selection: {
    eyebrow: "به‌زودی",
    title: "انتخاب نهایی رشته",
    description:
      "جمع‌بندی و ثبت انتخاب نهایی پس از جلسه مشاوره. فعلاً جایگاه معماری در سامانه.",
    icon: "medal",
    accent: "emerald",
  },
};

export default async function GuidancePortalServicePage({
  searchParams,
}: GuidancePortalServicePageProps) {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const params = searchParams ? await searchParams : {};
  const view = params.view ?? "dashboard";

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAssessments: false,
    includeAchievements: false,
    includeExperience: false,
  });

  if (!snapshot.flags.guidanceEnabled) {
    notFound();
  }

  const plan = snapshot.guidance.plan;
  if (!plan) {
    const guidance = StudentInsightEngine.guidance(snapshot);
    return (
      <div className="portal-journey portal-journey--empty gp-dashboard">
        <PortalJourneyHeroBanner
          hero={
            guidance.emptyHero ??
            buildGuidanceEmptyJourneyHero()
          }
        />
      </div>
    );
  }

  const interestSession = await loadGuidanceInterestSession({
    organizationId: context.organization.id,
    userId: context.user.id,
    planId: plan.id,
    planPublicId: plan.publicId,
  });

  const profileSession = await loadGuidanceProfile360Session({
    organizationId: context.organization.id,
    userId: context.user.id,
    planId: plan.id,
    planPublicId: plan.publicId,
  });

  const profileSeed = {
    studentName: snapshot.profile.studentName,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    examGroup: plan.examGroup,
  };

  const profileJourneyComplete = isProfile360JourneyComplete(
    profileSession,
    profileSeed,
  );

  const steps = buildGuidancePortalTimeline(plan, {
    interestAssessmentStatus: interestSession.status,
    profileCompletionStatus: profileJourneyComplete
      ? "completed"
      : profileSession.status === "not_started"
        ? "not_started"
        : "in_progress",
  });

  const interestModel = buildInterestAssessmentPresentationModel({
    session: interestSession,
    studentName: snapshot.profile.studentName,
  });

  const profileModel = buildStudentProfilePresentationModel({
    session: profileSession,
    studentName: snapshot.profile.studentName,
    portraitUrl: snapshot.profile.portraitUrl,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    examGroup: plan.examGroup,
  });

  if (view === "interest") {
    if (!plan.latestFinalGrades) {
      redirect("/portal/student/services/guidance");
    }
    return <InterestDiscoveryScreen model={interestModel} />;
  }

  if (view === "profile") {
    if (interestSession.status !== "completed") {
      redirect("/portal/student/services/guidance?view=interest");
    }
    return <Student360ProfileScreen model={profileModel} />;
  }

  const analysis = buildAnalysisPresentationModel({
    plan,
    steps,
    studentName: snapshot.profile.studentName,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    averageScore: snapshot.dashboard.averageScore,
  });

  const journey = buildGuidanceJourneyModel({
    steps,
    publicId: plan.publicId,
  });

  if (view === "journey") {
    return <PortalJourneyScreen model={journey} />;
  }

  if (view === "analysis") {
    if (!analysis.visible) {
      return (
        <GuidancePlatformPlaceholder
          eyebrow="تحلیل اولیه"
          title="تحلیل هنوز باز نشده"
          description="پس از بارگذاری و بررسی کارنامه، مرکز تحلیل اولیه اینجا فعال می‌شود."
          icon="chart"
          accent="blue"
          primaryHref="/portal/student/services/guidance?view=journey"
          primaryLabel="رفتن به سفر هدایت"
        />
      );
    }
    return <GuidanceAnalysisScreen model={analysis} />;
  }

  if (view === "case") {
    return (
      <GuidanceCaseScreen
        studentName={snapshot.profile.studentName}
        journey={journey}
        analysis={analysis.visible ? analysis : null}
        planPublicId={plan.publicId}
      />
    );
  }

  if (view in PLACEHOLDERS) {
    const copy = PLACEHOLDERS[view as PlaceholderView];
    return (
      <GuidancePlatformPlaceholder
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        icon={copy.icon}
        accent={copy.accent}
        secondaryHref={
          view === "settings" ? "/portal/student" : undefined
        }
        secondaryLabel={
          view === "settings" ? "بازگشت به پرتال دانش‌آموز" : undefined
        }
        primaryHref={
          view === "documents"
            ? "/portal/student/services/guidance/grades"
            : "/portal/student/services/guidance"
        }
        primaryLabel={
          view === "documents" ? "بارگذاری کارنامه" : "بازگشت به داشبورد"
        }
      />
    );
  }

  // Default: Guidance Platform dashboard (Major Selection home)
  return (
    <GuidancePlatformDashboard
      studentName={snapshot.profile.studentName}
      journey={journey}
      analysis={analysis.visible ? analysis : null}
    />
  );
}
