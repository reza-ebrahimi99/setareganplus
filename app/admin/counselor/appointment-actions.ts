"use server";

import { revalidatePath } from "next/cache";
import {
  confirmCounselorAppointment,
  rejectCounselorAppointment,
} from "@/lib/counselor-os/appointment-lifecycle";
import { proposeAlternativeSlot } from "@/lib/counselor-os/appointment-alternative";
import {
  legacyCancelWithReason,
  legacyConfirmAsDefinitive,
  legacyRevertToPendingConfirmation,
} from "@/lib/counselor-os/appointment-legacy";
import {
  adminCancelAppointment,
  adminRescheduleAppointment,
  bookOpenSlotForStudentByStaff,
  completeAppointmentWithReport,
  markAppointmentNoShow,
} from "@/lib/counselor-os/appointment-operations";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { saveSessionRecord, type SaveSessionInput } from "@/lib/counselor-os/sessions";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";

export type AppointmentActionState = {
  error?: string;
  success?: string;
};

export async function confirmCounselorAppointmentAction(
  appointmentId: string,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const result = await confirmCounselorAppointment({ ctx, appointmentId });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  revalidatePath("/admin/counselor");
  revalidatePath(`/admin/counselor/appointments/${appointmentId}`);
  return { success: "جلسه تأیید شد و برای دانش‌آموز قفل شد." };
}

export async function rejectCounselorAppointmentAction(
  appointmentId: string,
  reason?: string,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const result = await rejectCounselorAppointment({
    ctx,
    appointmentId,
    reason,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  revalidatePath("/admin/counselor");
  return { success: "درخواست رد شد و نوبت آزاد شد." };
}

export async function legacyResolveAction(
  appointmentId: string,
  mode: "confirm" | "revert" | "cancel",
  reason?: string,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const result =
    mode === "confirm"
      ? await legacyConfirmAsDefinitive({ ctx, appointmentId, reason })
      : mode === "revert"
        ? await legacyRevertToPendingConfirmation({ ctx, appointmentId, reason })
        : await legacyCancelWithReason({ ctx, appointmentId, reason });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  return { success: "وضعیت legacy ثبت شد." };
}

export async function proposeAlternativeAction(
  appointmentId: string,
  newSlotId: string,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const result = await proposeAlternativeSlot({ ctx, appointmentId, newSlotId });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  return { success: "پیشنهاد زمان برای دانش‌آموز ارسال شد." };
}

export async function staffBookSlotAction(
  slotId: string,
  studentId: string,
): Promise<AppointmentActionState & { appointmentId?: string }> {
  const ctx = await requireCounselorContext();
  const result = await bookOpenSlotForStudentByStaff({ ctx, slotId, studentId });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  return { success: "رزرو مدیریتی ثبت شد.", appointmentId: result.appointmentId };
}

export async function adminRescheduleAction(
  appointmentId: string,
  newSlotId: string,
  reason: string,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const result = await adminRescheduleAppointment({
    ctx,
    appointmentId,
    newSlotId,
    reason,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/counselor/appointments/${appointmentId}`);
  revalidatePath("/admin/counselor/appointments");
  return { success: "زمان جلسه تغییر کرد." };
}

export async function adminCancelAction(
  appointmentId: string,
  reason: string,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const result = await adminCancelAppointment({ ctx, appointmentId, reason });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  return { success: "جلسه لغو شد." };
}

export async function markNoShowAction(appointmentId: string, reason?: string) {
  const ctx = await requireCounselorContext();
  const result = await markAppointmentNoShow({ ctx, appointmentId, reason });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/counselor/appointments");
  return { success: "غیبت ثبت شد." };
}

export async function saveAppointmentReportAction(
  _prev: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const ctx = await requireCounselorContext();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) return { error: "شناسه گزارش نامعتبر است." };
  const nextRaw = String(formData.get("nextFollowUpAt") ?? "").trim();
  const startedRaw = String(formData.get("startedAt") ?? "").trim();
  const endedRaw = String(formData.get("endedAt") ?? "").trim();
  const input: SaveSessionInput = {
    keyPoints: String(formData.get("keyPoints") ?? ""),
    decisions: String(formData.get("decisions") ?? ""),
    layoutChangeNotes: String(formData.get("layoutChangeNotes") ?? ""),
    body: String(formData.get("followUpItems") ?? ""),
    studentActionItems: String(formData.get("studentActionItems") ?? ""),
    counselorActionItems: String(formData.get("counselorActionItems") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    counselorInternalNotes: String(formData.get("counselorInternalNotes") ?? ""),
    sessionOutcome: String(formData.get("sessionOutcome") ?? ""),
    nextFollowUpAt: nextRaw ? parseTehranDateTimeLocal(nextRaw) : null,
    startedAt: startedRaw ? parseTehranDateTimeLocal(startedRaw) : null,
    endedAt: endedRaw ? parseTehranDateTimeLocal(endedRaw) : null,
    saveDraft: formData.get("intent") !== "complete",
    markCompleted: formData.get("intent") === "complete",
  };
  try {
    await saveSessionRecord({ ctx, sessionId, input });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ذخیره انجام نشد." };
  }
  revalidatePath(`/admin/counselor/appointments`);
  return { success: input.markCompleted ? "جلسه تکمیل شد." : "پیش‌نویس ذخیره شد." };
}
