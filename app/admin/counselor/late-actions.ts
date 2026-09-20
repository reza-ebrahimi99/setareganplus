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
  restoreChoiceItem,
  revisePublishedFinalList,
  reorderChoiceItems,
  supervisorReopenFinal,
  updateChoiceItem,
} from "@/lib/guidance/journey-v2/choices";
import { CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import { parseChoiceWorkbook } from "@/lib/guidance/choice-studio/excel";
import { choiceManualInputFromFormData } from "@/lib/guidance/choice-studio/manual-input";
import { takeFirstRowsForDraft } from "@/lib/guidance/choice-studio/preview-limits";
import type { CanonicalChoiceRow, ChoiceImportPreview } from "@/lib/guidance/choice-studio/types";
import { SANJESH_ACTIVE_LIMIT } from "@/lib/guidance/choice-studio/types";
import { runChoiceDraftImport } from "@/lib/counselor-os/choice-draft-import";
import { correctKonkurField } from "@/lib/guidance/journey-v2/konkur";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { SANJESH_STATUS } from "@/lib/guidance/journey-v2/constants";
import { verifySanjeshSubmission } from "@/lib/guidance/journey-v2/sanjesh";

export type CounselorLateState = {
  error?: string;
  success?: string;
  preview?: ChoiceImportPreview;
};

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
    const input = choiceManualInputFromFormData(formData);
    await addChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      input: {
        major: input.major ?? "",
        university: input.university ?? "",
        city: input.city ?? "",
        province: input.province ?? "",
        educationType: input.educationType ?? "",
        admissionType: input.admissionType ?? "",
        officialCode: input.officialCode,
        band: input.band,
        notes: input.notes ?? "",
        rationale: input.rationale ?? "",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMPTY_CHOICE_ITEM") {
      return {};
    }
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
    const input = choiceManualInputFromFormData(formData);
    await updateChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
      input: {
        major: input.major ?? "",
        university: input.university ?? "",
        city: input.city ?? "",
        province: input.province ?? "",
        educationType: input.educationType ?? "",
        admissionType: input.admissionType ?? "",
        officialCode: input.officialCode,
        band: input.band,
        notes: input.notes ?? "",
        rationale: input.rationale ?? "",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMPTY_CHOICE_ITEM") {
      return {};
    }
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

export async function restoreChoiceItemAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx } = await gated(studentId);
    await restoreChoiceItem({
      organizationId: ctx.organizationId,
      listId: field(formData, "listId"),
      itemId: field(formData, "itemId"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "بازیابی ممکن نشد." };
  }
  refresh(studentId);
  return { success: "انتخاب به فهرست فعال برگشت." };
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
  let publishedCount = 0;
  let advanceNote = "";
  try {
    const { ctx, plan } = await gated(studentId);
    const listId = field(formData, "listId");
    await markListReady({
      organizationId: ctx.organizationId,
      listId,
      counselorUserId: ctx.userId,
      reason: field(formData, "reason"),
    });
    const { prisma } = await import("@/lib/prisma");
    publishedCount = await prisma.guidanceChoiceItem.count({
      where: { listId, organizationId: ctx.organizationId, isActive: true },
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
      if (!advanced.ok) {
        advanceNote = " فهرست منتشر شد اما مرحله پرونده جلو نرفت. صفحه را تازه کنید.";
      }
    }
    if (phase === "final" && plan.currentStep === 16) {
      const advanced = await advanceGuidanceJourneyV2Step({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        studentId,
        stepId: 16,
      });
      if (!advanced.ok) {
        advanceNote = " فهرست منتشر شد اما مرحله پرونده جلو نرفت. صفحه را تازه کنید.";
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "اعلام آمادگی ممکن نشد." };
  }
  refresh(studentId);
  const base =
    phase === "final"
      ? `نسخه نهایی با ${publishedCount} انتخاب برای تأیید دانش‌آموز ارسال شد.`
      : `نسخه اولیه با ${publishedCount} انتخاب منتشر شد.`;
  return { success: `${base}${advanceNote}` };
}

export async function startFinalRevisionAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    const { ctx, plan } = await gated(studentId);
    await revisePublishedFinalList({
      organizationId: ctx.organizationId,
      planId: plan.id,
      studentId,
      counselorUserId: ctx.userId,
    });
    if (plan.currentStep === 17) {
      const reopened = await reopenV2FromStep({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        studentId,
        resumeAt: 16,
        dropFrom: 17,
        metadata: { counselorRevision: true },
      });
      if (!reopened.ok) return { error: reopened.error };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "باز کردن پیش‌نویس اصلاحی ممکن نشد." };
  }
  refresh(studentId);
  return { success: "پیش‌نویس نسخه اصلاح‌شده آماده است. نسخه منتشرشده قبلی به‌عنوان سابقه حفظ شد." };
}

export async function parseChoiceExcelAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  try {
    await gated(studentId);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return { error: "ابتدا یک فایل XLSX انتخاب کنید." };
    }
    const preview = await parseChoiceWorkbook(file);
    return { preview };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "خواندن فایل اکسل ممکن نشد." };
  }
}

export async function importChoiceExcelAction(
  _prev: CounselorLateState,
  formData: FormData,
): Promise<CounselorLateState> {
  const studentId = field(formData, "studentId");
  const kind = field(formData, "kind") === "FINAL" ? CHOICE_LIST_KIND.FINAL : CHOICE_LIST_KIND.INITIAL;
  const truncateFirst150 = field(formData, "truncateFirst150") === "1";
  try {
    const { ctx, plan } = await gated(studentId);
    const raw = field(formData, "rows");
    let rows: CanonicalChoiceRow[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error("invalid");
      rows = parsed as CanonicalChoiceRow[];
    } catch {
      return { error: "پیش‌نمایش منقضی شده است. فایل را دوباره بارگذاری کنید." };
    }
    if (rows.length === 0) {
      return { error: "ردیفی برای ورود وجود ندارد." };
    }

    const importRows = truncateFirst150 ? takeFirstRowsForDraft(rows) : rows;
    if (!truncateFirst150 && importRows.length > SANJESH_ACTIVE_LIMIT) {
      const extra = importRows.length - SANJESH_ACTIVE_LIMIT;
      return {
        error: `تعداد انتخاب‌ها ${importRows.length} مورد است؛ حداکثر ${SANJESH_ACTIVE_LIMIT} انتخاب مجاز است. ابتدا ${extra} مورد را حذف کنید.`,
      };
    }
    if (truncateFirst150 && rows.length > SANJESH_ACTIVE_LIMIT) {
      if (field(formData, "truncateAck") !== "1") {
        return { error: "برای انتقال ۱۵۰ انتخاب اول، تأیید صریح لازم است." };
      }
    }

    const requestId = field(formData, "requestId") || `legacy-${Date.now()}`;
    const result = await runChoiceDraftImport({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      studentId,
      payload: {
        requestId,
        kind: kind === CHOICE_LIST_KIND.FINAL ? "FINAL" : "INITIAL",
        mode: truncateFirst150 ? "truncate_first_150" : "full",
        truncateAck: truncateFirst150 && field(formData, "truncateAck") === "1",
        replaceReady: field(formData, "replaceReady") === "1",
        rows,
      },
    });
    if (!result.ok) {
      return { error: result.error };
    }
    if (!result.idempotentReplay) {
      refresh(studentId);
    }
    const dropped =
      truncateFirst150 && rows.length > result.importedCount
        ? rows.length - result.importedCount
        : 0;
    return {
      success:
        dropped > 0
          ? `${result.importedCount} انتخاب اول در پیش‌نویس ذخیره شد (${dropped} انتخاب اضافی وارد نشد). نسخه ${result.version}.`
          : `${kind === "FINAL" ? "نسخه اصلاح‌شده" : "نسخه اولیه"} با ${result.importedCount} انتخاب از اکسل ذخیره شد (نسخه ${result.version}).`,
    };
  } catch (e) {
    console.error("[choice-studio] importChoiceExcel failed", {
      studentId,
      message: e instanceof Error ? e.message : "unknown",
    });
    return { error: e instanceof Error ? e.message : "ورود از اکسل ممکن نشد." };
  }
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
