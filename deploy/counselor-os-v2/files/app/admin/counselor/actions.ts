"use server";

import { revalidatePath } from "next/cache";
import { CounselorNoteVisibility } from "@/generated/prisma/enums";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  createCounselorAvailabilityRule,
} from "@/lib/counselor-os/booking";
import { linkCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import { correctPersonalInfoField } from "@/lib/counselor-os/corrections";
import {
  completeCounselorFollowUp,
  createCounselorFollowUp,
  rescheduleCounselorFollowUp,
} from "@/lib/counselor-os/follow-ups";
import { addCounselorNote } from "@/lib/counselor-os/notes";
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
        nextFollowUpAt: nextRaw ? new Date(nextRaw) : null,
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
      dueAt: new Date(dueRaw),
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
      dueAt: new Date(dueRaw),
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
  return { success: "زمان آزاد ثبت شد." };
}
