/**
 * StudentProfilePresentationModel builder — pure mapping, no JSX.
 */

import { toPersianDigits } from "@/lib/persian";
import { STUDENT_PROFILE_SECTIONS } from "@/lib/guidance/profile360/sections";
import type {
  StudentProfileActionCard,
  StudentProfileData,
  StudentProfileFieldValue,
  StudentProfileHealth,
  StudentProfileMissingCard,
  StudentProfilePresentationModel,
  StudentProfileSectionId,
  StudentProfileSectionModel,
  StudentProfileSectionValues,
  StudentProfileSessionRecord,
  StudentProfileWidgetModel,
} from "@/lib/guidance/profile360/types";

const PROFILE_HREF = "/portal/student/services/guidance?view=profile";
const GUIDANCE_HOME = "/portal/student/services/guidance";

function isFilled(value: StudentProfileFieldValue | undefined): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((v) => v.trim().length > 0);
  return value.trim().length > 0;
}

function sectionValues(
  data: StudentProfileData,
  sectionId: StudentProfileSectionId,
): StudentProfileSectionValues {
  return data[sectionId] ?? {};
}

function buildSectionModels(
  data: StudentProfileData,
): StudentProfileSectionModel[] {
  return STUDENT_PROFILE_SECTIONS.map((def) => {
    if (def.architectureOnly) {
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        accent: def.accent,
        fields: def.fields,
        values: {},
        filledCount: 0,
        totalCount: def.fields.length,
        requiredMissing: [],
        percent: 0,
        state: "architecture",
        architectureOnly: true,
      };
    }

    const values = sectionValues(data, def.id);
    const filledCount = def.fields.filter((f) => isFilled(values[f.id])).length;
    const requiredMissing = def.fields
      .filter((f) => f.required && !isFilled(values[f.id]))
      .map((f) => f.label);
    const percent =
      def.fields.length === 0
        ? 0
        : Math.round((filledCount / def.fields.length) * 100);

    let state: StudentProfileSectionModel["state"] = "empty";
    if (filledCount === 0) state = "empty";
    else if (requiredMissing.length === 0 && filledCount === def.fields.length) {
      state = "complete";
    } else if (requiredMissing.length === 0) state = "partial";
    else state = "partial";

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      accent: def.accent,
      fields: def.fields,
      values,
      filledCount,
      totalCount: def.fields.length,
      requiredMissing,
      percent,
      state,
    };
  });
}

export function computeProfileCompletionPercent(
  sections: readonly StudentProfileSectionModel[],
): number {
  const editable = sections.filter((s) => !s.architectureOnly);
  if (editable.length === 0) return 0;
  const sum = editable.reduce((acc, s) => acc + s.percent, 0);
  return Math.round(sum / editable.length);
}

export function computeProfileHealth(
  percent: number,
): StudentProfileHealth {
  if (percent >= 85) return "excellent";
  if (percent >= 60) return "good";
  if (percent >= 30) return "incomplete";
  return "critical";
}

export function profileHealthLabel(health: StudentProfileHealth): string {
  switch (health) {
    case "excellent":
      return "عالی";
    case "good":
      return "خوب";
    case "incomplete":
      return "ناقص";
    case "critical":
      return "بحرانی";
  }
}

function seedData(input: {
  studentName: string;
  gradeName: string | null;
  schoolYear: string | null;
  examGroup: string | null;
  data: StudentProfileData;
}): StudentProfileData {
  const personal = { ...(input.data.personal ?? {}) };
  const academic = { ...(input.data.academic ?? {}) };
  if (!isFilled(personal.fullName)) personal.fullName = input.studentName;
  if (!isFilled(academic.gradeName) && input.gradeName) {
    academic.gradeName = input.gradeName;
  }
  if (!isFilled(academic.schoolYear) && input.schoolYear) {
    academic.schoolYear = input.schoolYear;
  }
  if (!isFilled(academic.examGroup) && input.examGroup) {
    academic.examGroup = input.examGroup;
  }
  return {
    ...input.data,
    personal,
    academic,
  };
}

function buildMissing(
  sections: readonly StudentProfileSectionModel[],
): StudentProfileMissingCard[] {
  return sections
    .filter(
      (s) =>
        !s.architectureOnly &&
        (s.state === "empty" || s.requiredMissing.length > 0),
    )
    .slice(0, 6)
    .map((s) => ({
      id: `missing-${s.id}`,
      sectionId: s.id,
      title: s.title,
      description:
        s.requiredMissing.length > 0
          ? `موارد لازم: ${s.requiredMissing.join("، ")}`
          : "هنوز اطلاعاتی ثبت نشده است.",
      ctaLabel: "تکمیل این بخش",
      href: `${PROFILE_HREF}#section-${s.id}`,
      accent: s.accent,
      icon: s.icon,
    }));
}

function buildActions(
  missing: readonly StudentProfileMissingCard[],
  health: StudentProfileHealth,
  percent: number,
): StudentProfileActionCard[] {
  const actions: StudentProfileActionCard[] = [];
  if (missing[0]) {
    actions.push({
      id: "act-next-section",
      title: `تکمیل «${missing[0].title}»`,
      description: missing[0].description,
      href: missing[0].href,
      label: "ویرایش سریع",
      accent: missing[0].accent,
      icon: missing[0].icon,
    });
  }
  if (health === "critical" || health === "incomplete") {
    actions.push({
      id: "act-boost",
      title: "بالا بردن سلامت پرونده",
      description: "با تکمیل بخش‌های ضروری، وضعیت پرونده بهتر می‌شود.",
      href: PROFILE_HREF,
      label: "ادامه تکمیل",
      accent: "gold",
      icon: "route",
    });
  }
  if (percent >= 80) {
    actions.push({
      id: "act-mark-ready",
      title: "ثبت آمادگی پرونده",
      description: "پرونده برای گام‌های بعدی مسیر آماده است.",
      href: PROFILE_HREF,
      label: "مشاهده پروفایل",
      accent: "emerald",
      icon: "medal",
    });
  }
  return actions.slice(0, 4);
}

function buildWidget(
  session: StudentProfileSessionRecord,
  percent: number,
  health: StudentProfileHealth,
): StudentProfileWidgetModel {
  const status = session.status;
  const statusLabel =
    status === "completed"
      ? "تکمیل‌شده"
      : status === "in_progress"
        ? "در حال تکمیل"
        : "شروع نشده";

  return {
    title: "پروفایل ۳۶۰ درجه",
    status,
    statusLabel,
    health,
    healthLabel: profileHealthLabel(health),
    progressPercent: percent,
    completionLabel: `${toPersianDigits(percent)}٪ تکمیل`,
    description:
      status === "completed"
        ? "هویت دیجیتال برای هدایت تحصیلی آماده است."
        : "پرونده هویتی بخش‌به‌بخش — نه یک فرم طولانی.",
    cta: {
      href: PROFILE_HREF,
      label:
        status === "completed"
          ? "مشاهده پروفایل"
          : status === "in_progress"
            ? "ادامه تکمیل"
            : "شروع تکمیل پروفایل",
    },
    accent: "teal",
    icon: "user",
  };
}

export function buildStudentProfilePresentationModel(input: {
  session: StudentProfileSessionRecord;
  studentName: string;
  portraitUrl: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  examGroup: string | null;
}): StudentProfilePresentationModel {
  const data = seedData({
    studentName: input.studentName,
    gradeName: input.gradeName,
    schoolYear: input.schoolYear,
    examGroup: input.examGroup,
    data: input.session.data,
  });

  const sections = buildSectionModels(data);
  const editable = sections.filter((s) => !s.architectureOnly);
  const completionPercent = computeProfileCompletionPercent(sections);
  const health = computeProfileHealth(completionPercent);
  const missing = buildMissing(sections);
  const recommendedActions = buildActions(missing, health, completionPercent);
  const widget = buildWidget(input.session, completionPercent, health);
  const filledSections = editable.filter(
    (s) => s.state === "complete" || s.state === "partial",
  ).length;

  return {
    planPublicId: input.session.planPublicId,
    studentName: input.studentName,
    portraitUrl: input.portraitUrl,
    session: { ...input.session, data },
    health,
    healthLabel: profileHealthLabel(health),
    completionPercent,
    filledSections,
    totalSections: editable.length,
    sections,
    missing,
    recommendedActions,
    recentChanges: input.session.recentChanges,
    widgets: {
      completion: widget,
      recentChanges: {
        title: "تغییرات اخیر",
        items: input.session.recentChanges,
        emptyTitle: "هنوز تغییری ثبت نشده",
        emptyDescription: "پس از ذخیره هر بخش، تاریخچه اینجا دیده می‌شود.",
      },
      missing: {
        title: "اطلاعات ناقص",
        items: missing,
        emptyTitle: "بخش ضروری ناقصی نیست",
        emptyDescription: "آفرین — موارد لازم تکمیل شده‌اند.",
      },
      recommendedActions: {
        title: "اقدام‌های پیشنهادی",
        items: recommendedActions,
      },
      quickEdit: {
        title: "ویرایش سریع",
        sections: editable.slice(0, 8).map((s) => ({
          id: s.id,
          title: s.title,
          href: `${PROFILE_HREF}#section-${s.id}`,
          icon: s.icon,
        })),
      },
    },
    hero: {
      eyebrow: "هویت دیجیتال دانش‌آموز",
      headline: input.studentName,
      support:
        "پروفایل ۳۶۰ درجه — بخش‌به‌بخش، با نمره تکمیل و سلامت پرونده. نه یک فرم CRUD.",
      accent: "teal",
      icon: "user",
      statusLabel: `${profileHealthLabel(health)} · ${toPersianDigits(completionPercent)}٪`,
    },
    returnHref: GUIDANCE_HOME,
    futureAiSlots: [],
  };
}

export function buildStudentProfileDashboardWidget(
  session: StudentProfileSessionRecord,
  seed: {
    studentName: string;
    gradeName: string | null;
    schoolYear: string | null;
    examGroup: string | null;
  },
): StudentProfileWidgetModel {
  const model = buildStudentProfilePresentationModel({
    session,
    studentName: seed.studentName,
    portraitUrl: null,
    gradeName: seed.gradeName,
    schoolYear: seed.schoolYear,
    examGroup: seed.examGroup,
  });
  return model.widgets.completion;
}

/** Journey treats profile complete at healthy threshold. */
export function isProfile360JourneyComplete(
  session: StudentProfileSessionRecord,
  seed: {
    studentName: string;
    gradeName: string | null;
    schoolYear: string | null;
    examGroup: string | null;
  },
): boolean {
  if (session.status === "completed") return true;
  const model = buildStudentProfilePresentationModel({
    session,
    studentName: seed.studentName,
    portraitUrl: null,
    gradeName: seed.gradeName,
    schoolYear: seed.schoolYear,
    examGroup: seed.examGroup,
  });
  return model.completionPercent >= 80 && model.health !== "critical";
}
