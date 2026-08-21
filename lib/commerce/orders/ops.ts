/**
 * Commerce order operations mutations (advance / rollback / notes / edit / pay).
 */

import {
  CommerceAcquisitionSource,
  CommerceBookletPaymentMethod,
  CommerceFulfillmentStatus,
  CommerceOpsStage,
  CommerceOrderEventType,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
  CommerceStudentGrade,
  CommerceStudentMajor,
} from "@/generated/prisma/enums";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import {
  canAdvanceCommerceOpsStage,
  canRollbackCommerceOpsStage,
  nextCommerceOpsStage,
  syncedLifecycleForOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { parseBookletOrderProfile } from "@/lib/commerce/orders/profile";
import { assertCommerceHandoverStaff } from "@/lib/commerce/orders/staff";
import {
  recordCommerceOrderEvent,
  stageChangedEventInput,
} from "@/lib/commerce/orders/timeline";
import { enqueueCommerceOrderPaidSms, enqueueCommerceOrderStageSms } from "@/lib/commerce/commerce-sms";
import { notifyCommerceOpsStaff } from "@/lib/commerce/orders/notify";
import { prisma } from "@/lib/prisma";

function sanitizePickupSignature(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value.startsWith("data:image/png;base64,")) return null;
  if (value.length > 180_000) return null;
  return value;
}

export type CommerceOpsResult =
  | { ok: true }
  | { ok: false; error: string };

async function loadOrderForOps(params: {
  organizationId: string;
  orderId: string;
  allowedBranchIds?: readonly string[] | null;
}) {
  return prisma.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
      ...commerceAllowedBranchScope(params.allowedBranchIds),
    },
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      pickupBranchId: true,
      opsStage: true,
      paymentStatus: true,
      notes: true,
      specialNotes: true,
      buyerName: true,
      buyerFirstName: true,
      buyerLastName: true,
      buyerMobile: true,
      handoverStaffUserId: true,
      qrToken: true,
      metadata: true,
    },
  });
}

function applyLifecycle(
  stage: CommerceOpsStageValue,
  paymentPaid: boolean,
  extra: Record<string, unknown> = {},
) {
  const synced = syncedLifecycleForOpsStage(stage, paymentPaid);
  return {
    opsStage: stage as CommerceOpsStage,
    status: synced.status as CommerceOrderStatus,
    fulfillmentStatus: synced.fulfillmentStatus as CommerceFulfillmentStatus | null,
    ...extra,
  };
}

async function assertOpsBranch(params: {
  organizationId: string;
  branchId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const branch = await prisma.branch.findFirst({
    where: {
      id: params.branchId,
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  if (!branch) return { ok: false, error: "شعبه معتبر نیست." };
  if (
    params.allowedBranchIds &&
    !params.allowedBranchIds.includes(branch.id)
  ) {
    return { ok: false, error: "دسترسی به این شعبه ندارید." };
  }
  return { ok: true };
}

export async function recordCommerceOrderPayment(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  note?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };
  if (order.paymentStatus === CommerceOrderPaymentStatus.PAID) {
    return { ok: false, error: "پرداخت این سفارش قبلاً ثبت شده است." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: applyLifecycle("PAID", true),
    });
    await recordCommerceOrderEvent(
      tx,
      stageChangedEventInput({
        organizationId: order.organizationId,
        orderId: order.id,
        stage: "PAID",
        actorUserId: params.actorUserId,
        note: params.note,
      }),
    );
  });
  void notifyCommerceOpsStaff({
    organizationId: order.organizationId,
    orderId: order.id,
    kind: "PAYMENT_RECEIVED",
    actorUserId: params.actorUserId,
    body: order.buyerName,
  }).catch((error) => console.error("[commerce-ops] notify failed", error));
  void enqueueCommerceOrderPaidSms({
    organizationId: order.organizationId,
    orderId: order.id,
  }).catch((error) => console.error("[commerce-ops] paid sms failed", error));

  return { ok: true };
}

export async function advanceCommerceOrderStage(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  note?: string | null;
  handoverStaffUserId?: string | null;
  pickupSignedBy?: string | null;
  pickupSignaturePng?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const paymentPaid = order.paymentStatus === CommerceOrderPaymentStatus.PAID;
  if (order.opsStage === "REGISTERED" && !paymentPaid) {
    return recordCommerceOrderPayment(params);
  }

  const next = nextCommerceOpsStage(order.opsStage as CommerceOpsStageValue);
  const staffId = (params.handoverStaffUserId ?? order.handoverStaffUserId ?? "").trim();

  let handoverName: string | null = null;
  if (next === "DELIVERED_TO_STUDENT") {
    const staff = await assertCommerceHandoverStaff({
      organizationId: order.organizationId,
      userId: staffId,
    });
    if (!staff.ok) return staff;
    handoverName = staff.name;
  }

  const gate = canAdvanceCommerceOpsStage({
    current: order.opsStage as CommerceOpsStageValue,
    paymentPaid,
    handoverStaffUserId: staffId || null,
  });
  if (!gate.ok) return gate;

  const now = new Date();
  const extra =
    gate.next === "IN_PRODUCTION"
      ? {
          inProductionAt: now,
        }
      : gate.next === "READY_FOR_PICKUP"
        ? {
            readyForPickupAt: now,
            readyForPickupByUserId: params.actorUserId,
          }
      : gate.next === "DELIVERED_TO_STUDENT"
        ? (() => {
            const signature = sanitizePickupSignature(params.pickupSignaturePng);
            const signedName =
              params.pickupSignedBy?.trim() || (signature ? "امضای دانش‌آموز" : "");
            const previousMeta =
              order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
                ? (order.metadata as Record<string, unknown>)
                : {};
            return {
              deliveredAt: now,
              deliveredByUserId: staffId || params.actorUserId,
              handoverStaffUserId: staffId || params.actorUserId,
              deliveryNote: params.note?.trim() || null,
              pickupSignedBy: signedName || null,
              pickupSignedAt: signedName || signature ? now : null,
              ...(signature
                ? { metadata: { ...previousMeta, pickupSignaturePng: signature } }
                : {}),
            };
          })()
        : {};

  const note =
    gate.next === "DELIVERED_TO_STUDENT" && handoverName
      ? [params.note?.trim(), `مسئول تحویل: ${handoverName}`].filter(Boolean).join(" · ")
      : params.note;

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: applyLifecycle(gate.next, paymentPaid, extra),
    });
    await recordCommerceOrderEvent(
      tx,
      stageChangedEventInput({
        organizationId: order.organizationId,
        orderId: order.id,
        stage: gate.next,
        actorUserId: params.actorUserId,
        note,
      }),
    );
  });

  const notifyKind =
    gate.next === "IN_PRODUCTION"
      ? "ENTERED_PRODUCTION"
      : gate.next === "READY_FOR_PICKUP"
        ? "READY"
        : gate.next === "DELIVERED_TO_STUDENT"
          ? "DELIVERED"
          : null;
  if (notifyKind) {
    void notifyCommerceOpsStaff({
      organizationId: order.organizationId,
      orderId: order.id,
      kind: notifyKind,
      actorUserId: params.actorUserId,
      body: order.buyerName,
    }).catch((error) => console.error("[commerce-ops] notify failed", error));
  }
  if (gate.next === "IN_PRODUCTION" || gate.next === "READY_FOR_PICKUP" || gate.next === "DELIVERED_TO_STUDENT") {
    void enqueueCommerceOrderStageSms({
      organizationId: order.organizationId,
      orderId: order.id,
      stage: gate.next,
    }).catch((error) => console.error("[commerce-ops] stage sms failed", error));
  }

  return { ok: true };
}

export async function rollbackCommerceOrderStage(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  note?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };
  if (order.opsStage === "DELIVERED_TO_STUDENT" && !params.note?.trim()) {
    return { ok: false, error: "برای بازگشت سفارش تحویل‌شده، دلیل الزامی است." };
  }

  const paymentPaid = order.paymentStatus === CommerceOrderPaymentStatus.PAID;
  const gate = canRollbackCommerceOpsStage({
    current: order.opsStage as CommerceOpsStageValue,
    paymentPaid,
    allowDeliveredRollback: true,
  });
  if (!gate.ok) return gate;

  const extra =
    order.opsStage === "DELIVERED_TO_STUDENT"
      ? {
          deliveredAt: null,
          deliveredByUserId: null,
          handoverStaffUserId: null,
          deliveryNote: null,
          pickupSignedBy: null,
          pickupSignedAt: null,
        }
      : order.opsStage === "READY_FOR_PICKUP"
        ? {
            readyForPickupAt: null,
            readyForPickupByUserId: null,
          }
        : order.opsStage === "IN_PRODUCTION"
          ? {
              inProductionAt: null,
            }
          : {};

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: applyLifecycle(gate.previous, paymentPaid, extra),
    });
    await recordCommerceOrderEvent(
      tx,
      stageChangedEventInput({
        organizationId: order.organizationId,
        orderId: order.id,
        stage: gate.previous,
        actorUserId: params.actorUserId,
        note: params.note,
        rolledBack: true,
      }),
    );
  });
  void notifyCommerceOpsStaff({
    organizationId: order.organizationId,
    orderId: order.id,
    kind: "ROLLBACK",
    actorUserId: params.actorUserId,
    body: params.note,
  }).catch((error) => console.error("[commerce-ops] notify failed", error));

  return { ok: true };
}

export async function addCommerceOrderNote(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  body: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const note = params.body.trim();
  if (!note) return { ok: false, error: "متن یادداشت خالی است." };

  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const merged = [order.notes?.trim(), note].filter(Boolean).join("\n\n");

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: { notes: merged },
    });
    await recordCommerceOrderEvent(tx, {
      organizationId: order.organizationId,
      orderId: order.id,
      eventType: CommerceOrderEventType.NOTE_ADDED,
      title: "یادداشت داخلی",
      note,
      actorUserId: params.actorUserId,
    });
  });

  return { ok: true };
}

export async function updateCommerceOrderDetails(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  formData?: FormData;
  buyerName?: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  parentName?: string | null;
  buyerMobile?: string;
  buyerNationalCode?: string | null;
  studentGrade?: string | null;
  studentMajor?: string | null;
  branchId?: string | null;
  pickupBranchId?: string | null;
  notes?: string;
  specialNotes?: string | null;
  urgentDelivery?: boolean;
  referredBy?: string | null;
  discountCode?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const form = params.formData;
  const formFirstName = form ? String(form.get("buyerFirstName") ?? "").trim() : "";
  const formLastName = form ? String(form.get("buyerLastName") ?? "").trim() : "";
  const combinedName = (
    params.buyerName ?? (form ? String(form.get("buyerName") ?? "") : "")
  ).trim();
  const nameParts = combinedName.split(/\s+/).filter(Boolean);
  const firstName =
    (params.buyerFirstName ?? formFirstName) || nameParts[0] || "";
  const lastName =
    (params.buyerLastName ?? formLastName) || nameParts.slice(1).join(" ");

  const parsed = parseBookletOrderProfile({
    buyerFirstName: firstName,
    buyerLastName: lastName,
    parentName:
      params.parentName ??
      (form ? String(form.get("parentName") ?? "") : order.buyerName),
    buyerMobile:
      params.buyerMobile ??
      (form ? String(form.get("buyerMobile") ?? "") : order.buyerMobile),
    buyerNationalCode:
      params.buyerNationalCode ??
      (form ? String(form.get("buyerNationalCode") ?? "") : null),
    studentGrade:
      params.studentGrade ??
      (form ? String(form.get("studentGrade") ?? "") : null),
    studentMajor:
      params.studentMajor ??
      (form ? String(form.get("studentMajor") ?? "") : null),
    pickupBranchId:
      params.pickupBranchId ??
      (form ? String(form.get("pickupBranchId") ?? "") : order.pickupBranchId),
    notes: params.notes ?? (form ? String(form.get("notes") ?? "") : order.notes),
    specialNotes:
      params.specialNotes ??
      (form ? String(form.get("specialNotes") ?? "") : order.specialNotes),
    urgentDelivery:
      params.urgentDelivery ??
      (form ? form.get("urgentDelivery") === "on" || form.get("urgentDelivery") === "1" : undefined),
    referredBy:
      params.referredBy ?? (form ? String(form.get("referredBy") ?? "") : null),
    discountCode:
      params.discountCode ?? (form ? String(form.get("discountCode") ?? "") : null),
    acquisitionSource: form ? String(form.get("acquisitionSource") ?? "") : null,
    bookletPaymentMethod: form ? String(form.get("bookletPaymentMethod") ?? "") : null,
    preferredPickupAt: form ? String(form.get("preferredPickupAt") ?? "") : null,
  });
  if (!parsed.ok) return parsed;
  const profile = parsed.profile;
  const opsVip = form
    ? form.get("opsVip") === "on" || form.get("opsVip") === "1"
    : undefined;

  const branchIdRaw =
    params.branchId !== undefined
      ? params.branchId
      : form
        ? String(form.get("branchId") ?? "").trim() || null
        : undefined;

  if (profile.pickupBranchId) {
    const pickup = await assertOpsBranch({
      organizationId: params.organizationId,
      branchId: profile.pickupBranchId,
      allowedBranchIds: params.allowedBranchIds,
    });
    if (!pickup.ok) return pickup;
  }

  if (branchIdRaw) {
    const branch = await assertOpsBranch({
      organizationId: params.organizationId,
      branchId: branchIdRaw,
      allowedBranchIds: params.allowedBranchIds,
    });
    if (!branch.ok) return branch;
  }

  const branchChanged =
    (branchIdRaw !== undefined && (branchIdRaw || null) !== (order.branchId || null)) ||
    profile.pickupBranchId !== (order.pickupBranchId || "");

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: {
        buyerFirstName: profile.buyerFirstName,
        buyerLastName: profile.buyerLastName,
        buyerName: profile.buyerName,
        parentName: profile.parentName,
        buyerMobile: profile.buyerMobile,
        buyerNationalCode: profile.buyerNationalCode,
        studentGrade: profile.studentGrade as CommerceStudentGrade,
        studentMajor: profile.studentMajor
          ? (profile.studentMajor as CommerceStudentMajor)
          : null,
        pickupBranchId: profile.pickupBranchId,
        ...(branchIdRaw !== undefined ? { branchId: branchIdRaw || null } : {}),
        notes: profile.notes,
        specialNotes: profile.specialNotes,
        urgentDelivery: profile.urgentDelivery,
        ...(opsVip !== undefined ? { opsVip } : {}),
        preferredPickupAt: profile.preferredPickupAt,
        acquisitionSource: profile.acquisitionSource
          ? (profile.acquisitionSource as CommerceAcquisitionSource)
          : null,
        referredBy: profile.referredBy,
        discountCode: profile.discountCode,
        bookletPaymentMethod: profile.bookletPaymentMethod
          ? (profile.bookletPaymentMethod as CommerceBookletPaymentMethod)
          : null,
      },
    });
    await recordCommerceOrderEvent(tx, {
      organizationId: order.organizationId,
      orderId: order.id,
      eventType: branchChanged
        ? CommerceOrderEventType.BRANCH_ASSIGNED
        : CommerceOrderEventType.EDITED,
      title: branchChanged ? "شعبه به‌روزرسانی شد" : "ویرایش سفارش",
      actorUserId: params.actorUserId,
      metadata: {
        pickupBranchId: profile.pickupBranchId,
        branchId: branchIdRaw ?? null,
      },
    });
  });

  return { ok: true };
}
