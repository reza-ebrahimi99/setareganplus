"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  guidanceJourneyV2StepPath,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import {
  APPOINTMENT_PURPOSE,
  CHOICE_LIST_KIND,
  V2_INFORMED_ACK_VERSION,
} from "@/lib/guidance/journey-v2/constants";
import {
  bookV2Session,
  cancelV2Session,
  rescheduleV2Session,
  loadPurposeAppointmentView,
} from "@/lib/guidance/journey-v2/appointments";
import { validateKonkurInput, saveKonkurResult, loadSelectedExamGroups } from "@/lib/guidance/journey-v2/konkur";
import {
  loadChoiceListView,
  reviewStats,
  saveStudentFeedback,
  confirmFinalList,
} from "@/lib/guidance/journey-v2/choices";
import { declareSanjeshSubmission } from "@/lib/guidance/journey-v2/sanjesh";
import { assertPackagePaid } from "@/lib/guidance/journey-v2/plan";

export type LateFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateJourney(step: GuidanceV2StepId) {
  revalidatePath(guidanceJourneyV2StepPath(step));
  revalidatePath("/portal/student/services/guidance");
  revalidatePath("/admin/counselor");
}

async function requirePaidStep(step: GuidanceV2StepId) {
  const access = await requireGuidanceV2StepAccess(step);
  if (access.plan.currentStep !== step) {
    redirect(guidanceJourneyV2StepPath(access.plan.currentStep));
  }
  return access;
}

function packageGuard(plan: { packagePaidAtIso: string | null }): LateFormState | null {
  if (!assertPackagePaid(plan)) {
    return { error: "برای ادامه، بسته انتخاب رشته باید پرداخت شده باشد." };
  }
  return null;
}

export async function bookV2SessionAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const step = Number(field(formData, "step")) as GuidanceV2StepId;
  const purpose =
    step === 15 ? APPOINTMENT_PURPOSE.SECOND_SESSION : APPOINTMENT_PURPOSE.FIRST_SESSION;
  const access = await requirePaidStep(step);
  const unpaid = packageGuard(access.plan);
  if (unpaid) return unpaid;
  const studentId = access.plan.studentId;
  const slotId = field(formData, "slotId");
  if (!slotId) return { error: "زمان انتخاب نشده است." };

  const booked = await bookV2Session({
    organizationId: access.context.organization.id,
    studentId,
    userId: access.context.user.id,
    firstName: access.context.user.firstName || "دانش‌آموز",
    lastName: access.context.user.lastName || "",
    mobile: access.context.user.mobile ?? "",
    slotId,
    purpose,
  });
  if (!booked.ok) return { error: booked.error };
  revalidateJourney(step);
  return { ok: true };
}

export async function completeV2BookingStepAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const step = Number(field(formData, "step")) as 11 | 15;
  const purpose =
    step === 15 ? APPOINTMENT_PURPOSE.SECOND_SESSION : APPOINTMENT_PURPOSE.FIRST_SESSION;
  const access = await requirePaidStep(step);
  const unpaid = packageGuard(access.plan);
  if (unpaid) return unpaid;

  const appt = await loadPurposeAppointmentView({
    organizationId: access.context.organization.id,
    studentId: access.plan.studentId,
    purpose,
  });
  if (!appt) {
    return { error: "ابتدا یک نوبت معتبر رزرو کنید." };
  }

  const advanced = await advanceGuidanceJourneyV2Step({
    organizationId: access.context.organization.id,
    actorUserId: access.context.user.id,
    studentId: access.plan.studentId,
    stepId: step,
    metadata: { appointmentId: appt.id, purpose },
  });
  if (!advanced.ok) return { error: advanced.error };
  revalidateJourney(step);
  return { ok: true };
}

export async function cancelV2SessionAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const step = Number(field(formData, "step")) as 11 | 15;
  const purpose =
    step === 15 ? APPOINTMENT_PURPOSE.SECOND_SESSION : APPOINTMENT_PURPOSE.FIRST_SESSION;
  const access = await requirePaidStep(step);
  const unpaid = packageGuard(access.plan);
  if (unpaid) return unpaid;
  const result = await cancelV2Session({
    organizationId: access.context.organization.id,
    studentId: access.plan.studentId,
    appointmentId: field(formData, "appointmentId"),
    purpose,
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(step);
  return {};
}

export async function rescheduleV2SessionAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const step = Number(field(formData, "step")) as 11 | 15;
  const purpose =
    step === 15 ? APPOINTMENT_PURPOSE.SECOND_SESSION : APPOINTMENT_PURPOSE.FIRST_SESSION;
  const access = await requirePaidStep(step);
  const unpaid = packageGuard(access.plan);
  if (unpaid) return unpaid;
  const result = await rescheduleV2Session({
    organizationId: access.context.organization.id,
    studentId: access.plan.studentId,
    appointmentId: field(formData, "appointmentId"),
    newSlotId: field(formData, "slotId"),
    purpose,
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(step);
  return { ok: true };
}

export async function submitKonkurResultAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const access = await requirePaidStep(12);
  const unpaid = packageGuard(access.plan);
  if (unpaid) return unpaid;

  const selected = await loadSelectedExamGroups({
    organizationId: access.context.organization.id,
    planPublicId: access.plan.publicId,
    planExamGroup: access.plan.examGroup,
  });
  const input: Record<string, string> = {};
  for (const key of formData.keys()) {
    if (key === "file") continue;
    input[key] = field(formData, key);
  }
  const validated = validateKonkurInput(input, selected);
  if (!validated.ok) {
    return { error: validated.error, fieldErrors: validated.fieldErrors };
  }

  const file = formData.get("file");
  const saved = await saveKonkurResult({
    organizationId: access.context.organization.id,
    actorUserId: access.context.user.id,
    planId: access.plan.id,
    planPublicId: access.plan.publicId,
    data: validated.data,
    file: file instanceof File && file.size > 0 ? file : null,
  });
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.fieldErrors };

  const advanced = await advanceGuidanceJourneyV2Step({
    organizationId: access.context.organization.id,
    actorUserId: access.context.user.id,
    studentId: access.plan.studentId,
    stepId: 12,
  });
  if (!advanced.ok) return { error: advanced.error };
  revalidateJourney(12);
  return { ok: true };
}

export async function saveChoiceFeedbackAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const access = await requirePaidStep(14);
  try {
    await saveStudentFeedback({
      organizationId: access.context.organization.id,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
      studentUserId: access.context.user.id,
      verdict: field(formData, "verdict"),
      note: field(formData, "note"),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ثبت بازخورد ممکن نشد." };
  }
  revalidateJourney(14);
  return { ok: true };
}

export async function completeChoiceReviewAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const access = await requirePaidStep(14);
  const list = await loadChoiceListView({
    organizationId: access.context.organization.id,
    planId: access.plan.id,
    kind: CHOICE_LIST_KIND.INITIAL,
  });
  if (!list || list.id !== field(formData, "listId")) {
    return { error: "فهرست بررسی نامعتبر است." };
  }
  const stats = await reviewStats(list);
  if (stats.remaining > 0) {
    return {
      error: `هنوز ${stats.remaining} انتخاب بررسی نشده است. برای ادامه همه انتخاب‌های فعال را بررسی کنید.`,
    };
  }

  const advanced = await advanceGuidanceJourneyV2Step({
    organizationId: access.context.organization.id,
    actorUserId: access.context.user.id,
    studentId: access.plan.studentId,
    stepId: 14,
    metadata: { listId: list.id, reviewed: stats.reviewed },
  });
  if (!advanced.ok) return { error: advanced.error };
  revalidateJourney(14);
  return { ok: true };
}

export async function confirmInformedChoiceListAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const access = await requirePaidStep(17);
  const ack1 = field(formData, "ackReviewed") === "on";
  const ack2 = field(formData, "ackOrder") === "on";
  const ack3 = field(formData, "ackSanjesh") === "on";
  if (!ack1 || !ack2 || !ack3) {
    return { error: "برای تأیید آگاهانه باید هر سه مورد را بپذیرید." };
  }

  const list = await loadChoiceListView({
    organizationId: access.context.organization.id,
    planId: access.plan.id,
    kind: CHOICE_LIST_KIND.FINAL,
  });
  if (!list || list.status !== "READY") {
    return { error: "نسخه نهایی هنوز آماده تأیید نیست." };
  }

  try {
    const confirmed = await confirmFinalList({
      organizationId: access.context.organization.id,
      listId: list.id,
      studentUserId: access.context.user.id,
      ackVersion: V2_INFORMED_ACK_VERSION,
    });

    const advanced = await advanceGuidanceJourneyV2Step({
      organizationId: access.context.organization.id,
      actorUserId: access.context.user.id,
      studentId: access.plan.studentId,
      stepId: 17,
      extraPlanData: {
        finalApprovedAt: new Date(),
        v2InformedAckVersion: V2_INFORMED_ACK_VERSION,
        v2InformedRevisionId: confirmed.id,
      },
      metadata: {
        listId: confirmed.id,
        version: confirmed.version,
        hash: confirmed.confirmationHash,
        ackVersion: V2_INFORMED_ACK_VERSION,
      },
    });
    if (!advanced.ok) return { error: advanced.error };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تأیید ممکن نشد." };
  }

  revalidateJourney(17);
  return { ok: true };
}

export async function declareSanjeshAction(
  _prev: LateFormState,
  formData: FormData,
): Promise<LateFormState> {
  const access = await requirePaidStep(18);
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !field(formData, "reference")) {
    return { error: "شناسه پیگیری یا رسید ثبت سنجش را وارد کنید." };
  }
  const declared = await declareSanjeshSubmission({
    organizationId: access.context.organization.id,
    actorUserId: access.context.user.id,
    planId: access.plan.id,
    planPublicId: access.plan.publicId,
    reference: field(formData, "reference"),
    note: field(formData, "note"),
    submittedAt: field(formData, "submittedAt"),
    file: file instanceof File && file.size > 0 ? file : null,
  });
  if (!declared.ok) return { error: declared.error };

  revalidateJourney(18);
  return { ok: true };
}
