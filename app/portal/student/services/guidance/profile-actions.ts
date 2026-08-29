"use server";

/**
 * Student 360° Profile — section save / complete actions.
 * No GuidancePlan schema mutation.
 */

import { revalidatePath } from "next/cache";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidanceInterestSession } from "@/lib/guidance/interest";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import {
  buildStudentProfilePresentationModel,
  getProfileSectionDef,
  loadGuidanceProfile360Session,
  saveGuidanceProfile360Session,
  type StudentProfileChangeItem,
  type StudentProfileData,
  type StudentProfileSectionId,
  type StudentProfileSectionValues,
  type StudentProfileSessionRecord,
  STUDENT_PROFILE_SECTION_IDS,
} from "@/lib/guidance/profile360";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export type Profile360ActionResult =
  | { ok: true; session: StudentProfileSessionRecord }
  | { ok: false; error: string };

async function requireProfileContext() {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    return { ok: false as const, error: "سامانه انتخاب رشته فعال نیست." };
  }
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { ok: false as const, error: "حساب دانش‌آموزی یافت نشد." };
  }
  const plan = await loadGuidancePlanForPortalUser({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan?.latestFinalGrades) {
    return { ok: false as const, error: "ابتدا کارنامه را بارگذاری کن." };
  }

  const interest = await loadGuidanceInterestSession({
    organizationId: context.organization.id,
    userId: context.user.id,
    planId: plan.id,
    planPublicId: plan.publicId,
  });
  if (interest.status !== "completed") {
    return {
      ok: false as const,
      error: "ابتدا آزمون رغبت را تکمیل کن.",
    };
  }

  return { ok: true as const, context, plan };
}

function revalidateProfilePaths() {
  revalidatePath("/portal/student/services/guidance");
}

function normalizeValues(
  sectionId: StudentProfileSectionId,
  raw: Record<string, unknown>,
): StudentProfileSectionValues {
  const def = getProfileSectionDef(sectionId);
  if (!def || def.architectureOnly) return {};
  const out: StudentProfileSectionValues = {};
  for (const field of def.fields) {
    const value = raw[field.id];
    if (field.type === "tags") {
      if (Array.isArray(value)) {
        out[field.id] = value
          .map((v) => String(v).trim())
          .filter(Boolean)
          .slice(0, 20);
      } else if (typeof value === "string") {
        out[field.id] = value
          .split(/[,،]/)
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 20);
      } else {
        out[field.id] = [];
      }
    } else if (typeof value === "string") {
      out[field.id] = value.trim().slice(0, field.type === "textarea" ? 2000 : 200);
    }
  }
  return out;
}

export async function saveProfile360SectionAction(input: {
  sectionId: string;
  values: Record<string, unknown>;
}): Promise<Profile360ActionResult> {
  const gate = await requireProfileContext();
  if (!gate.ok) return gate;

  if (
    !(STUDENT_PROFILE_SECTION_IDS as readonly string[]).includes(input.sectionId)
  ) {
    return { ok: false, error: "بخش نامعتبر است." };
  }
  const sectionId = input.sectionId as StudentProfileSectionId;
  const def = getProfileSectionDef(sectionId);
  if (!def || def.architectureOnly) {
    return { ok: false, error: "این بخش فعلاً فقط معماری است." };
  }

  const existing = await loadGuidanceProfile360Session({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const values = normalizeValues(sectionId, input.values);
  const data: StudentProfileData = {
    ...existing.data,
    [sectionId]: values,
  };

  const change: StudentProfileChangeItem = {
    id: `chg-${Date.now()}`,
    sectionId,
    sectionTitle: def.title,
    summary: `بخش «${def.title}» به‌روزرسانی شد`,
    atIso: new Date().toISOString(),
  };

  const seedModel = buildStudentProfilePresentationModel({
    session: {
      ...existing,
      data,
      status: "in_progress",
    },
    studentName: gate.context.user.displayName,
    portraitUrl: null,
    gradeName: null,
    schoolYear: null,
    examGroup: gate.plan.examGroup,
  });

  const status =
    seedModel.completionPercent >= 80 ? ("completed" as const) : ("in_progress" as const);

  const session = await saveGuidanceProfile360Session({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    status,
    data,
    recentChanges: [change, ...existing.recentChanges],
    startedAtIso: existing.startedAtIso ?? new Date().toISOString(),
    completedAtIso: status === "completed" ? new Date().toISOString() : null,
  });

  revalidateProfilePaths();
  return { ok: true, session };
}

export async function markProfile360CompleteAction(): Promise<Profile360ActionResult> {
  const gate = await requireProfileContext();
  if (!gate.ok) return gate;

  const existing = await loadGuidanceProfile360Session({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const model = buildStudentProfilePresentationModel({
    session: existing,
    studentName: gate.context.user.displayName,
    portraitUrl: null,
    gradeName: null,
    schoolYear: null,
    examGroup: gate.plan.examGroup,
  });

  if (model.completionPercent < 60) {
    return {
      ok: false,
      error: "برای ثبت آمادگی، حداقل ۶۰٪ پروفایل را کامل کن.",
    };
  }

  const change: StudentProfileChangeItem = {
    id: `chg-${Date.now()}`,
    sectionId: "personal",
    sectionTitle: "پروفایل ۳۶۰",
    summary: "پرونده به‌عنوان آماده علامت‌گذاری شد",
    atIso: new Date().toISOString(),
  };

  const session = await saveGuidanceProfile360Session({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    status: "completed",
    data: existing.data,
    recentChanges: [change, ...existing.recentChanges],
    startedAtIso: existing.startedAtIso ?? new Date().toISOString(),
    completedAtIso: new Date().toISOString(),
  });

  revalidateProfilePaths();
  return { ok: true, session };
}
