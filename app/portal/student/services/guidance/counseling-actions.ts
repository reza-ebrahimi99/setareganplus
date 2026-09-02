"use server";

import { revalidatePath } from "next/cache";
import { bookCounselorSlotForStudent } from "@/lib/counselor-os/booking";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export type CounselorActionState = {
  error?: string;
  success?: string;
};

export async function bookStudentCounselingSlotAction(
  _prev: CounselorActionState,
  formData: FormData,
): Promise<CounselorActionState> {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { error: "حساب دانش‌آموز یافت نشد." };
  }

  const slotId = String(formData.get("slotId") ?? "").trim();
  if (!slotId) return { error: "زمان انتخاب نشده است." };

  const result = await bookCounselorSlotForStudent({
    organizationId: context.organization.id,
    studentId,
    userId: context.user.id,
    slotId,
    firstName: context.user.firstName || "دانش‌آموز",
    lastName: context.user.lastName || "",
    mobile: context.user.mobile ?? "",
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/portal/student/services/guidance");
  return { success: "جلسه با موفقیت رزرو شد." };
}
