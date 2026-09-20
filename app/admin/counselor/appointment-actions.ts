"use server";

import { revalidatePath } from "next/cache";
import {
  confirmCounselorAppointment,
  rejectCounselorAppointment,
} from "@/lib/counselor-os/appointment-lifecycle";
import { requireCounselorContext } from "@/lib/counselor-os/auth";

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
