"use server";

import { revalidatePath } from "next/cache";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import { advanceGuidanceJourneyV2Step, reopenV2FromStep } from "@/lib/guidance/journey-v2/advance";
import {
  addChoiceItem,
  duplicateChoiceItem,
  ensureWorkingList,
  markListReady,
  moveChoiceItem,
  removeChoiceItem,
  reorderChoiceItems,
  supervisorReopenFinal,
  updateChoiceItem,
} from "@/lib/guidance/journey-v2/choices";
import { CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import { correctKonkurField } from "@/lib/guidance/journey-v2/konkur";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { SANJESH_STATUS } from "@/lib/guidance/journey-v2/constants";
import { verifySanjeshSubmission } from "@/lib/guidance/journey-v2/sanjesh";

export type CounselorLateState = { error?: string; success?: string };

function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function gated(studentId: string) {
  const ctx = await requireCounselorContext();
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });
  const plan = await loadGuidanceV2Plan({
    organizationId: ctx.organizationId,
    studentId,
  });
  if (!plan) throw new Error("پرونده V2 یافت نشد.");
  return { ctx, plan };
}

function refresh(studentId: string) {
  revalidatePath(`/admin/counselor/students/${studentId}`);
  revalidatePath(`/admin/counselor/students/${studentId}/choices`);
  revalidatePath("/admin/counselor");
  revalidatePath("/portal/student/services/guidance");
}

export async function startArrangementAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  const kind = field(formData, "kind") === "FINAL" ? CHOICE_LIST_KIND.FINAL : CHOICE_LIST_KIND.INITIAL;
  try {
    const { ctx, plan } = await gated(studentId);
    await ensureWorkingList({
      organizationId: ctx.organizationId,
      planId: plan.id,
      studentId,
      counselorUserId: ctx.userId,
      kind,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "شروع چیدمان ممکن نشد." };
  }
  refresh(studentId);
  return { success: "فضای چیدمان آماده است." };
}

export async function addChoiceItemAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx } = await gated(studentId);
    await addChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      input: {
        major: field(formData, "major"),
        university: field(formData, "university"),
        city: field(formData, "city"),
        province: field(formData, "province"),
        educationType: field(formData, "educationType"),
        admissionType: field(formData, "admissionType"),
        officialCode: field(formData, "officialCode") || null,
        band: field(formData, "band") || null,
        notes: field(formData, "notes"),
        rationale: field(formData, "rationale"),
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "افزودن انتخاب ممکن نشد." };
  }
  refresh(studentId);
  return { success: "انتخاب افزوده شد." };
}

export async function updateChoiceItemAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx } = await gated(studentId);
    await updateChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
      input: {
        major: field(formData, "major"),
        university: field(formData, "university"),
        city: field(formData, "city"),
        province: field(formData, "province"),
        educationType: field(formData, "educationType"),
        admissionType: field(formData, "admissionType"),
        officialCode: field(formData, "officialCode") || null,
        band: field(formData, "band") || null,
        notes: field(formData, "notes"),
        rationale: field(formData, "rationale"),
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ویرایش ممکن نشد." };
  }
  refresh(studentId);
  return { success: "انتخاب به‌روز شد." };
}

export async function removeChoiceItemAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx } = await gated(studentId);
    await removeChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "حذف ممکن نشد." };
  }
  refresh(studentId);
  return { success: "انتخاب از فهرست فعال خارج شد." };
}

export async function duplicateChoiceItemAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx } = await gated(studentId);
    await duplicateChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "کپی ممکن نشد." };
  }
  refresh(studentId);
  return { success: "انتخاب کپی شد." };
}

export async function moveChoiceItemAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx } = await gated(studentId);
    await moveChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
      direction: field(formData, "direction") === "down" ? "down" : "up",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "جابه‌جایی ممکن نشد." };
  }
  refresh(studentId);
  return {};
}

export async function reorderChoiceItemsAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  const orderedIds = field(formData, "orderedIds")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const { ctx } = await gated(studentId);
    await reorderChoiceItems({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      orderedIds,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ذخیره ترتیب ممکن نشد." };
  }
  refresh(studentId);
  return { success: "ترتیب ذخیره شد." };
}

export async function markArrangementReadyAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  const phase = field(formData, "phase");
  try {
    const { ctx, plan } = await gated(studentId);
    await markListReady({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      counselorUserId: ctx.userId,
      reason: field(formData, "reason"),
    });

    if (phase === "initial" && plan.currentStep === 13) {
      const advanced = await advanceGuidanceJourneyV2Step({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        studentId,
        stepId: 13,
        extraPlanData: {
          choicesApprovedAt: new Date(),
          choicesApprovedByUserId: ctx.userId,
        },
      });
      if (!advanced.ok) return { error: advanced.error };
    }
    if (phase === "final" && plan.currentStep === 16) {
      const advanced = await advanceGuidanceJourneyV2Step({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        studentId,
        stepId: 16,
      });
      if (!advanced.ok) return { error: advanced.error };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "اعلام آمادگی ممکن نشد." };
  }
  refresh(studentId);
  return {
    success:
      phase === "final"
        ? "نسخه نهایی آماده تأیید دانش‌آموز است."
        : "نسخه اولیه چیدمان آماده است.",
  };
}

export async function correctKonkurFieldAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx, plan } = await gated(studentId);
    await correctKonkurField({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      studentId,
      planPublicId: plan.publicId,
      planExamGroup: plan.examGroup,
      fieldKey: field(formData, "fieldKey"),
      nextValue: field(formData, "nextValue"),
      reason: field(formData, "reason"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "اصلاح ممکن نشد." };
  }
  refresh(studentId);
  return { success: "اصلاح با سابقه ثبت شد." };
}

export async function verifySanjeshAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  const decision = field(formData, "decision") === "NEEDS_FIX" ? "NEEDS_FIX" : "VERIFIED";
  try {
    const { ctx, plan } = await gated(studentId);
    await verifySanjeshSubmission({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      planId: plan.id,
      decision,
      note: field(formData, "note"),
    });
    if (decision === "VERIFIED" && plan.currentStep === 18) {
      const advanced = await advanceGuidanceJourneyV2Step({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        studentId,
        stepId: 18,
        extraPlanData: {
          v2SanjeshStatus: SANJESH_STATUS.VERIFIED,
        },
      });
      if (!advanced.ok) return { error: advanced.error };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "بررسی رسید ممکن نشد." };
  }
  refresh(studentId);
  return {
    success: decision === "VERIFIED" ? "ثبت سنجش تأیید شد." : "نیاز به اصلاح برای دانش‌آموز ثبت شد.",
  };
}

export async function reopenConfirmedListAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx, plan } = await gated(studentId);
    if (!ctx.isSupervisor) {
      return { error: "فقط ناظر می‌تواند فهرست تأییدشده را بازگشایی کند." };
    }
    await supervisorReopenFinal({
      organizationId: ctx.organizationId,
      planId: plan.id,
      studentId,
      counselorUserId: ctx.userId,
    });
    const reopened = await reopenV2FromStep({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      studentId,
      resumeAt: 16,
      dropFrom: 17,
      metadata: { supervisorReopen: true },
    });
    if (!reopened.ok) return { error: reopened.error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "بازگشایی ممکن نشد." };
  }
  refresh(studentId);
  return { success: "فهرست برای اصلاح نهایی بازگشایی شد." };
}
