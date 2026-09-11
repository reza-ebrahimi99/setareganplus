"use server";

import { revalidatePath } from "next/cache";
import { CounselorNoteVisibility } from "@/generated/prisma/enums";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  createCounselorAvailabilityRule,
} from "@/lib/counselor-os/booking";
import {
  deleteCounselorDateException,
  parseWeeklyProgramJson,
  saveCounselorSchedule,
  upsertCounselorDateException,
} from "@/lib/counselor-os/schedule";
import { linkCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import { correctPersonalInfoField } from "@/lib/counselor-os/corrections";
import {
  completeCounselorFollowUp,
  createCounselorFollowUp,
  parseCounselorFollowUpDueAt,
  rescheduleCounselorFollowUp,
} from "@/lib/counselor-os/follow-ups";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import { addCounselorNote } from "@/lib/counselor-os/notes";
import {
  assignStudentToCounselor,
  unassignStudent,
} from "@/lib/counselor-os/assignments";
import {
  createCounselorProfile,
  saveCounselorPortrait,
  updateCounselorProfile,
} from "@/lib/counselor-os/profiles";
import {
  createSessionFromAppointment,
  saveSessionRecord,
} from "@/lib/counselor-os/sessions";

export type CounselorActionState = {
  error?: string;
  success?: string;
};

function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function saveSessionRecordAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const sessionId = field(formData, "sessionId");
  if (!sessionId) return { error: "شناسه جلسه نامعتبر است." };

  const nextRaw = field(formData, "nextFollowUpAt");
  try {
    const nextFollowUpAt = nextRaw ? parseTehranDateTimeLocal(nextRaw) : null;
    if (nextRaw && !nextFollowUpAt) {
      return { error: "تاریخ و ساعت پیگیری نامعتبر است." };
    }
    await saveSessionRecord({
      ctx,
      sessionId,
      input: {
        subject: field(formData, "subject"),
        body: field(formData, "body"),
        keyPoints: field(formData, "keyPoints"),
        decisions: field(formData, "decisions"),
        studentActionItems: field(formData, "studentActionItems"),
        counselorActionItems: field(formData, "counselorActionItems"),
        summary: field(formData, "summary"),
        nextFollowUpAt,
        markCompleted: formData.get("markCompleted") === "on",
        saveDraft: true,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ذخیره انجام نشد." };
  }

  revalidatePath(`/admin/counselor/sessions/${sessionId}`);
  revalidatePath("/admin/counselor");
  return { success: formData.get("markCompleted") === "on" ? "جلسه ثبت شد." : "پیش‌نویس ذخیره شد." };
}

export async function openSessionFromAppointmentAction(appointmentId: string) {
  const ctx = await requireCounselorContext();
  const id = await createSessionFromAppointment({ ctx, appointmentId });
  return `/admin/counselor/sessions/${id}`;
}

export async function addCounselorNoteAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const studentId = field(formData, "studentId");
  const body = field(formData, "body");
  if (!studentId || !body) return { error: "متن یادداشت الزامی است." };

  try {
    await addCounselorNote({
      ctx,
      studentId,
      body,
      visibility:
        field(formData, "visibility") === "PRIVATE"
          ? CounselorNoteVisibility.PRIVATE
          : CounselorNoteVisibility.GENERAL,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ثبت یادداشت انجام نشد." };
  }

  revalidatePath(`/admin/counselor/students/${studentId}`);
  return { success: "یادداشت ثبت شد." };
}

export async function createFollowUpAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const studentId = field(formData, "studentId");
  const title = field(formData, "title");
  const dueRaw = field(formData, "dueAt");
  if (!studentId || !title || !dueRaw) {
    return { error: "عنوان و تاریخ پیگیری الزامی است." };
  }

  try {
    await createCounselorFollowUp({
      ctx,
      studentId,
      title,
      description: field(formData, "description") || undefined,
      dueAt: parseCounselorFollowUpDueAt(dueRaw),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ثبت پیگیری انجام نشد." };
  }

  revalidatePath("/admin/counselor/follow-ups");
  revalidatePath(`/admin/counselor/students/${studentId}`);
  return { success: "پیگیری ثبت شد." };
}

export async function completeFollowUpAction(followUpId: string) {
  const ctx = await requireCounselorContext();
  await completeCounselorFollowUp({ ctx, followUpId });
  revalidatePath("/admin/counselor/follow-ups");
  revalidatePath("/admin/counselor");
}

export async function completeFollowUpFormAction(formData: FormData) {
  const followUpId = String(formData.get("followUpId") ?? "").trim();
  if (!followUpId) return;
  await completeFollowUpAction(followUpId);
}

export async function rescheduleFollowUpNativeAction(formData: FormData) {
  await rescheduleFollowUpFormAction({}, formData);
}

export async function linkBookingAdvisorFormAction(formData: FormData) {
  await linkBookingAdvisorAction({}, formData);
}

export async function rescheduleFollowUpFormAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const followUpId = field(formData, "followUpId");
  const dueRaw = field(formData, "dueAt");
  if (!followUpId || !dueRaw) return { error: "تاریخ جدید الزامی است." };
  try {
    await rescheduleCounselorFollowUp({
      ctx,
      followUpId,
      dueAt: parseCounselorFollowUpDueAt(dueRaw),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تغییر تاریخ انجام نشد." };
  }
  revalidatePath("/admin/counselor/follow-ups");
  return { success: "زمان پیگیری به‌روز شد." };
}

export async function correctStudentFieldAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const studentId = field(formData, "studentId");
  const fieldKey = field(formData, "fieldKey");
  const nextValue = field(formData, "nextValue");
  if (!studentId || !fieldKey || !nextValue) {
    return { error: "فیلد و مقدار جدید الزامی است." };
  }
  try {
    await correctPersonalInfoField({
      ctx,
      studentId,
      fieldKey,
      nextValue,
      reason: field(formData, "reason") || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "اصلاح انجام نشد." };
  }
  revalidatePath(`/admin/counselor/students/${studentId}`);
  return { success: "اصلاح ثبت شد و در تاریخچه ذخیره گردید." };
}

export async function linkBookingAdvisorAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const advisorId = field(formData, "advisorId");
  if (!advisorId) return { error: "پروفایل مشاور را انتخاب کنید." };
  try {
    await linkCounselorBookingAdvisor({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      advisorId,
      canReview: ctx.canReview,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "اتصال انجام نشد." };
  }
  revalidatePath("/admin/counselor/settings");
  revalidatePath("/admin/counselor/calendar");
  return { success: "پروفایل نوبت‌دهی متصل شد." };
}

export async function createAvailabilityRuleAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const weekday = Number(field(formData, "weekday"));
  const startLocalTime = field(formData, "startLocalTime");
  const endLocalTime = field(formData, "endLocalTime");
  if (!Number.isInteger(weekday) || !startLocalTime || !endLocalTime) {
    return { error: "روز و ساعت معتبر وارد کنید." };
  }

  try {
    await createCounselorAvailabilityRule({
      ctx,
      weekday,
      startLocalTime,
      endLocalTime,
      slotCapacity: 1,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ثبت زمان انجام نشد." };
  }

  revalidatePath("/admin/counselor/calendar");
  revalidatePath("/admin/counselor/settings");
  return { success: "زمان آزاد ثبت شد." };
}

export async function saveCounselorScheduleAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  try {
    await saveCounselorSchedule({
      ctx,
      advisorId: field(formData, "advisorId") || undefined,
      firstSessionMinutes: Number(field(formData, "firstSessionMinutes")),
      secondSessionMinutes: Number(field(formData, "secondSessionMinutes")),
      validFromYmd: field(formData, "firstValidFrom") || field(formData, "validFrom"),
      validUntilYmd: field(formData, "firstValidUntil") || field(formData, "validUntil"),
      firstValidFromYmd: field(formData, "firstValidFrom") || field(formData, "validFrom"),
      firstValidUntilYmd: field(formData, "firstValidUntil") || field(formData, "validUntil"),
      secondValidFromYmd: field(formData, "secondValidFrom") || field(formData, "validFrom"),
      secondValidUntilYmd: field(formData, "secondValidUntil") || field(formData, "validUntil"),
      days: parseWeeklyProgramJson(
        field(formData, "firstWindowsJson") || field(formData, "windowsJson"),
      ),
      firstDays: parseWeeklyProgramJson(
        field(formData, "firstWindowsJson") || field(formData, "windowsJson"),
      ),
      secondDays: parseWeeklyProgramJson(
        field(formData, "secondWindowsJson") || field(formData, "windowsJson"),
      ),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ذخیره برنامه انجام نشد." };
  }
  revalidatePath("/admin/counselor/calendar");
  revalidatePath("/admin/counselor/settings");
  revalidatePath("/admin/counselor/appointments");
  return { success: "برنامه زمانی مشاور ذخیره شد." };
}

export async function upsertCounselorExceptionAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const kindRaw = field(formData, "kind");
  const kind = kindRaw === "special" ? "special" : "blocked";
  try {
    await upsertCounselorDateException({
      ctx,
      advisorId: field(formData, "advisorId") || undefined,
      kind,
      localDateYmd: field(formData, "localDate"),
      startLocalTime: field(formData, "startLocalTime") || undefined,
      endLocalTime: field(formData, "endLocalTime") || undefined,
      reason: field(formData, "reason") || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ثبت استثنا انجام نشد." };
  }
  revalidatePath("/admin/counselor/calendar");
  revalidatePath("/admin/counselor/settings");
  return {
    success:
      kind === "blocked"
        ? "این تاریخ به‌عنوان تعطیل ثبت شد."
        : "زمان ویژه این تاریخ ثبت شد.",
  };
}

export async function deleteCounselorExceptionAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const exceptionId = field(formData, "exceptionId");
  if (!exceptionId) return { error: "استثنا مشخص نیست." };
  try {
    await deleteCounselorDateException({
      ctx,
      advisorId: field(formData, "advisorId") || undefined,
      exceptionId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "حذف استثنا انجام نشد." };
  }
  revalidatePath("/admin/counselor/calendar");
  revalidatePath("/admin/counselor/settings");
  return { success: "استثنا حذف شد." };
}

export async function assignStudentFromCaseAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const studentId = field(formData, "studentId");
  const counselorUserId = field(formData, "counselorUserId");
  if (!studentId || !counselorUserId) return { error: "مشاور و دانش‌آموز را انتخاب کنید." };
  try {
    await assignStudentToCounselor({
      ctx,
      studentId,
      counselorUserId,
      overrideCapacity: formData.get("overrideCapacity") === "1",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تخصیص انجام نشد." };
  }
  revalidatePath(`/admin/counselor/students/${studentId}`);
  revalidatePath("/admin/counselor/counselors");
  revalidatePath(`/admin/counselor/counselors/${counselorUserId}`);
  return { success: "تخصیص ثبت شد." };
}

export async function assignStudentToCounselorAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  return assignStudentFromCaseAction(_prev, formData);
}

export async function unassignStudentFormAction(formData: FormData) {
  await unassignStudentAction({}, formData);
}

export async function unassignStudentAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const studentId = field(formData, "studentId");
  const counselorUserId = field(formData, "counselorUserId");
  if (!studentId || !counselorUserId) return { error: "تخصیص نامعتبر است." };
  try {
    await unassignStudent({ ctx, studentId, counselorUserId });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "حذف تخصیص انجام نشد." };
  }
  revalidatePath(`/admin/counselor/counselors/${counselorUserId}`);
  revalidatePath(`/admin/counselor/students/${studentId}`);
  return { success: "تخصیص برداشته شد." };
}

export async function createCounselorAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const capacityRaw = field(formData, "capacity");
  try {
    const capacity =
      capacityRaw === ""
        ? null
        : Number.isFinite(Number(capacityRaw))
          ? Number(capacityRaw)
          : null;
    const id = await createCounselorProfile({
      ctx,
      firstName: field(formData, "firstName"),
      lastName: field(formData, "lastName"),
      mobile: field(formData, "mobile"),
      title: field(formData, "title") || undefined,
      specialty: field(formData, "specialty") || undefined,
      bio: field(formData, "bio") || undefined,
      capacity,
    });
    revalidatePath("/admin/counselor/counselors");
    revalidatePath(`/admin/counselor/counselors/${id}`);
    revalidatePath("/admin/counselor/calendar");
    return { success: "مشاور ساخته شد. ورود با همان سامانه پیامک/رمز یک‌بارمصرف انجام می‌شود." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ایجاد مشاور انجام نشد." };
  }
}

export async function updateCounselorAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const counselorUserId = field(formData, "counselorUserId");
  if (!counselorUserId) return { error: "شناسه مشاور نامعتبر است." };
  const capacityRaw = field(formData, "capacity");
  const activeRaw = field(formData, "isActive");
  try {
    await updateCounselorProfile({
      ctx,
      counselorUserId,
      firstName: field(formData, "firstName") || undefined,
      lastName: field(formData, "lastName") || undefined,
      mobile: field(formData, "mobile") || undefined,
      title: field(formData, "title"),
      specialty: field(formData, "specialty"),
      bio: field(formData, "bio"),
      capacity: !ctx.isSupervisor
        ? undefined
        : capacityRaw === ""
          ? null
          : Number.isFinite(Number(capacityRaw))
            ? Number(capacityRaw)
            : null,
      isActive: !ctx.isSupervisor || activeRaw === "" ? undefined : activeRaw === "true",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "به‌روزرسانی انجام نشد." };
  }
  revalidatePath("/admin/counselor/counselors");
  revalidatePath(`/admin/counselor/counselors/${counselorUserId}`);
  revalidatePath("/admin/counselor/settings");
  return { success: "پروفایل مشاور به‌روز شد." };
}

export async function verifyGuidanceDocumentFormAction(formData: FormData): Promise<void> {
  await verifyGuidanceDocumentAction({}, formData);
}

export async function verifyGuidanceDocumentAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const studentId = field(formData, "studentId");
  const documentId = field(formData, "documentId");
  const planId = field(formData, "planId");
  const decision = field(formData, "decision");
  const note = field(formData, "note");
  if (!studentId || !documentId || !planId) {
    return { error: "مدرک نامعتبر است." };
  }
  if (decision !== "VERIFIED" && decision !== "REJECTED") {
    return { error: "تصمیم بررسی نامعتبر است." };
  }
  const { verifyGuidanceDocumentAsCounselor } = await import(
    "@/lib/guidance/workspace/documents"
  );
  const { assertCounselorCanAccessStudent } = await import("@/lib/counselor-os/auth");
  try {
    await assertCounselorCanAccessStudent({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      studentId,
      canReview: ctx.canReview,
    });
    const result = await verifyGuidanceDocumentAsCounselor({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      planId,
      documentId,
      decision,
      note,
    });
    if (!result.ok) return { error: result.error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ثبت بررسی مدرک ممکن نشد." };
  }
  revalidatePath(`/admin/counselor/students/${studentId}`);
  return {
    success:
      decision === "VERIFIED"
        ? "مدرک تأیید شد."
        : "نیاز به اصلاح برای دانش‌آموز ثبت شد.",
  };
}

export async function uploadCounselorPhotoAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const ctx = await requireCounselorContext();
  const counselorUserId = field(formData, "counselorUserId");
  const file = formData.get("photo");
  if (!counselorUserId || !(file instanceof File) || file.size === 0) {
    return { error: "تصویر را انتخاب کنید." };
  }
  try {
    await saveCounselorPortrait({ ctx, counselorUserId, file });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "بارگذاری تصویر انجام نشد." };
  }
  revalidatePath(`/admin/counselor/counselors/${counselorUserId}`);
  revalidatePath("/admin/counselor/counselors");
  return { success: "تصویر پروفایل ذخیره شد." };
}
