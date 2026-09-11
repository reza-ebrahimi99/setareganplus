/**
 * V2 choice engine — ordered lists with INITIAL / FINAL revisions.
 * Student feedback never destroys counselor order. Confirmed FINAL is locked.
 */

import { createHash } from "node:crypto";
import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { guidanceEducationTypeLabel } from "@/lib/guidance/journey/reference-data/education-types";
import {
  CHOICE_LIST_KIND,
  CHOICE_LIST_STATUS,
  MAX_GUIDANCE_CHOICES,
  type ChoiceBandId,
  type ChoiceFeedbackVerdict,
  type ChoiceListKind,
} from "@/lib/guidance/journey-v2/constants";
import { isChoiceBandId, isChoiceFeedbackVerdict } from "@/lib/guidance/journey-v2/labels";

export type ChoiceItemInput = {
  major: string;
  university: string;
  city?: string;
  province?: string;
  educationType?: string;
  admissionType?: string;
  officialCode?: string | null;
  band?: string | null;
  notes?: string | null;
  rationale?: string | null;
  isActive?: boolean;
};

export type ChoiceItemView = {
  id: string;
  sortOrder: number;
  major: string;
  university: string;
  city: string;
  province: string;
  educationType: string;
  educationTypeLabel: string;
  admissionType: string;
  officialCode: string | null;
  band: string | null;
  notes: string;
  rationale: string;
  isActive: boolean;
  sourceItemId: string | null;
  feedback: {
    verdict: ChoiceFeedbackVerdict | null;
    verdictLabel: string;
    note: string;
  } | null;
};

export type ChoiceListView = {
  id: string;
  kind: ChoiceListKind;
  version: number;
  status: string;
  counselorUserId: string;
  readyAtIso: string | null;
  confirmedAtIso: string | null;
  confirmationHash: string | null;
  items: ChoiceItemView[];
};

function cleanText(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

function normalizeItem(input: ChoiceItemInput) {
  const major = cleanText(input.major, 160);
  const university = cleanText(input.university, 160);
  if (!major || !university) {
    throw new Error("رشته و دانشگاه الزامی است.");
  }
  const official = cleanText(input.officialCode ?? "", 40);
  const band = input.band && isChoiceBandId(input.band) ? input.band : null;
  return {
    major,
    university,
    city: cleanText(input.city, 80) || null,
    province: cleanText(input.province, 80) || null,
    educationType: cleanText(input.educationType, 40) || null,
    admissionType: cleanText(input.admissionType, 80) || null,
    officialCode: official || null,
    band,
    notes: cleanText(input.notes, 800) || null,
    rationale: cleanText(input.rationale, 800) || null,
    isActive: input.isActive !== false,
    source: "MANUAL",
  };
}

export function hashChoiceList(
  items: Array<Pick<ChoiceItemView, "sortOrder" | "major" | "university" | "officialCode" | "isActive">>,
): string {
  const payload = items
    .filter((i) => i.isActive)
    .map((i) => [i.sortOrder, i.officialCode ?? "", i.university, i.major].join("|"))
    .join("\n");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

async function loadListRow(params: {
  organizationId: string;
  planId: string;
  kind: ChoiceListKind;
  status?: string;
}) {
  return prisma.guidanceChoiceList.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      kind: params.kind,
      ...(params.status ? { status: params.status } : { status: { not: CHOICE_LIST_STATUS.SUPERSEDED } }),
    },
    orderBy: { version: "desc" },
  });
}

export async function loadChoiceListView(params: {
  organizationId: string;
  planId: string;
  kind: ChoiceListKind;
  includeInactive?: boolean;
}): Promise<ChoiceListView | null> {
  const list = await loadListRow(params);
  if (!list) return null;

  const [items, feedback] = await Promise.all([
    prisma.guidanceChoiceItem.findMany({
      where: {
        organizationId: params.organizationId,
        listId: list.id,
        ...(params.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.guidanceChoiceFeedback.findMany({
      where: { organizationId: params.organizationId, listId: list.id },
    }),
  ]);

  const feedbackByItem = new Map(feedback.map((f) => [f.itemId, f]));

  return {
    id: list.id,
    kind: list.kind as ChoiceListKind,
    version: list.version,
    status: list.status,
    counselorUserId: list.counselorUserId,
    readyAtIso: list.readyAt?.toISOString() ?? null,
    confirmedAtIso: list.confirmedAt?.toISOString() ?? null,
    confirmationHash: list.confirmationHash,
    items: items.map((item) => {
      const fb = feedbackByItem.get(item.id);
      return {
        id: item.id,
        sortOrder: item.sortOrder,
        major: item.major,
        university: item.university,
        city: item.city ?? "",
        province: item.province ?? "",
        educationType: item.educationType ?? "",
        educationTypeLabel: item.educationType
          ? guidanceEducationTypeLabel(item.educationType)
          : "—",
        admissionType: item.admissionType ?? "",
        officialCode: item.officialCode,
        band: item.band,
        notes: item.notes ?? "",
        rationale: item.rationale ?? "",
        isActive: item.isActive,
        sourceItemId: item.sourceItemId,
        feedback: fb
          ? {
              verdict: isChoiceFeedbackVerdict(fb.verdict) ? fb.verdict : null,
              verdictLabel: fb.verdict,
              note: fb.note ?? "",
            }
          : null,
      };
    }),
  };
}

export async function ensureWorkingList(params: {
  organizationId: string;
  planId: string;
  studentId: string;
  counselorUserId: string;
  kind: ChoiceListKind;
}) {
  const existing = await loadListRow({
    organizationId: params.organizationId,
    planId: params.planId,
    kind: params.kind,
  });
  if (existing && existing.status !== CHOICE_LIST_STATUS.CONFIRMED) {
    return existing;
  }
  if (existing?.status === CHOICE_LIST_STATUS.CONFIRMED) {
    throw new Error("فهرست تأییدشده قفل است. بازگشایی فقط با ناظر ممکن است.");
  }

  if (params.kind === CHOICE_LIST_KIND.FINAL) {
    const initial = await loadListRow({
      organizationId: params.organizationId,
      planId: params.planId,
      kind: CHOICE_LIST_KIND.INITIAL,
    });
    if (!initial || initial.status === CHOICE_LIST_STATUS.DRAFT) {
      throw new Error("نسخه اولیه چیدمان هنوز آماده نیست.");
    }
    return copyList({
      sourceListId: initial.id,
      organizationId: params.organizationId,
      planId: params.planId,
      studentId: params.studentId,
      counselorUserId: params.counselorUserId,
      kind: CHOICE_LIST_KIND.FINAL,
    });
  }

  const last = await prisma.guidanceChoiceList.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      kind: params.kind,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return prisma.guidanceChoiceList.create({
    data: {
      organizationId: params.organizationId,
      planId: params.planId,
      studentId: params.studentId,
      kind: params.kind,
      version: (last?.version ?? 0) + 1,
      status: CHOICE_LIST_STATUS.DRAFT,
      counselorUserId: params.counselorUserId,
    },
  });
}

async function copyList(params: {
  sourceListId: string;
  organizationId: string;
  planId: string;
  studentId: string;
  counselorUserId: string;
  kind: ChoiceListKind;
}) {
  const sourceItems = await prisma.guidanceChoiceItem.findMany({
    where: { listId: params.sourceListId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const last = await prisma.guidanceChoiceList.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      kind: params.kind,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return prisma.$transaction(async (tx) => {
    const list = await tx.guidanceChoiceList.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        studentId: params.studentId,
        kind: params.kind,
        version: (last?.version ?? 0) + 1,
        status: CHOICE_LIST_STATUS.DRAFT,
        counselorUserId: params.counselorUserId,
      },
    });

    if (sourceItems.length > 0) {
      await tx.guidanceChoiceItem.createMany({
        data: sourceItems.map((item, index) => ({
          organizationId: params.organizationId,
          listId: list.id,
          sortOrder: index + 1,
          major: item.major,
          university: item.university,
          city: item.city,
          province: item.province,
          educationType: item.educationType,
          admissionType: item.admissionType,
          officialCode: item.officialCode,
          band: item.band,
          notes: item.notes,
          rationale: item.rationale,
          isActive: true,
          source: item.source,
          sourceItemId: item.id,
        })),
      });
    }

    return list;
  });
}

async function assertEditableList(params: {
  organizationId: string;
  listId: string;
  expectedKind?: ChoiceListKind;
}) {
  const list = await prisma.guidanceChoiceList.findFirst({
    where: { id: params.listId, organizationId: params.organizationId },
  });
  if (!list) throw new Error("فهرست انتخاب یافت نشد.");
  if (params.expectedKind && list.kind !== params.expectedKind) {
    throw new Error("این فهرست برای این مرحله قابل ویرایش نیست.");
  }
  if (list.status === CHOICE_LIST_STATUS.CONFIRMED) {
    throw new Error("فهرست تأییدشده قفل است.");
  }
  if (list.kind === CHOICE_LIST_KIND.INITIAL && list.status === CHOICE_LIST_STATUS.READY) {
    throw new Error("نسخه اولیه پس از اعلام آمادگی قفل است. اصلاحات در مرحله نهایی انجام می‌شود.");
  }
  return list;
}

export async function addChoiceItem(params: {
  organizationId: string;
  listId: string;
  input: ChoiceItemInput;
}) {
  const list = await assertEditableList(params);
  const data = normalizeItem(params.input);

  return prisma.$transaction(async (tx) => {
    const activeCount = await tx.guidanceChoiceItem.count({
      where: { listId: list.id, isActive: true },
    });
    if (data.isActive && activeCount >= MAX_GUIDANCE_CHOICES) {
      throw new Error(`حداکثر ${MAX_GUIDANCE_CHOICES} انتخاب فعال مجاز است.`);
    }
    const maxOrder = await tx.guidanceChoiceItem.aggregate({
      where: { listId: list.id },
      _max: { sortOrder: true },
    });
    return tx.guidanceChoiceItem.create({
      data: {
        organizationId: params.organizationId,
        listId: list.id,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        ...data,
      },
    });
  });
}

export async function updateChoiceItem(params: {
  organizationId: string;
  listId: string;
  itemId: string;
  input: ChoiceItemInput;
}) {
  await assertEditableList(params);
  const data = normalizeItem(params.input);
  const item = await prisma.guidanceChoiceItem.findFirst({
    where: {
      id: params.itemId,
      listId: params.listId,
      organizationId: params.organizationId,
    },
  });
  if (!item) throw new Error("انتخاب یافت نشد.");
  return prisma.guidanceChoiceItem.update({
    where: { id: item.id },
    data,
  });
}

export async function removeChoiceItem(params: {
  organizationId: string;
  listId: string;
  itemId: string;
}) {
  await assertEditableList(params);
  const item = await prisma.guidanceChoiceItem.findFirst({
    where: {
      id: params.itemId,
      listId: params.listId,
      organizationId: params.organizationId,
    },
  });
  if (!item) throw new Error("انتخاب یافت نشد.");
  await prisma.guidanceChoiceItem.update({
    where: { id: item.id },
    data: { isActive: false },
  });
}

export async function duplicateChoiceItem(params: {
  organizationId: string;
  listId: string;
  itemId: string;
}) {
  const item = await prisma.guidanceChoiceItem.findFirst({
    where: {
      id: params.itemId,
      listId: params.listId,
      organizationId: params.organizationId,
    },
  });
  if (!item) throw new Error("انتخاب یافت نشد.");
  return addChoiceItem({
    organizationId: params.organizationId,
    listId: params.listId,
    input: {
      major: item.major,
      university: item.university,
      city: item.city ?? "",
      province: item.province ?? "",
      educationType: item.educationType ?? "",
      admissionType: item.admissionType ?? "",
      officialCode: item.officialCode,
      band: item.band,
      notes: item.notes,
      rationale: item.rationale,
    },
  });
}

export async function reorderChoiceItems(params: {
  organizationId: string;
  listId: string;
  orderedIds: string[];
  expectedVersion?: number;
}) {
  const list = await assertEditableList(params);
  if (params.expectedVersion != null && list.version !== params.expectedVersion) {
    throw new Error("نسخه فهرست تغییر کرده است. صفحه را نوسازی کنید.");
  }

  const items = await prisma.guidanceChoiceItem.findMany({
    where: { listId: list.id, organizationId: params.organizationId, isActive: true },
    select: { id: true },
  });
  const existing = new Set(items.map((i) => i.id));
  if (params.orderedIds.length !== existing.size) {
    throw new Error("ترتیب ارسالی با فهرست فعلی هم‌خوان نیست.");
  }
  for (const id of params.orderedIds) {
    if (!existing.has(id)) throw new Error("شناسه انتخاب نامعتبر است.");
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < params.orderedIds.length; i += 1) {
      await tx.guidanceChoiceItem.update({
        where: { id: params.orderedIds[i] },
        data: { sortOrder: -(i + 1) },
      });
    }
    for (let i = 0; i < params.orderedIds.length; i += 1) {
      await tx.guidanceChoiceItem.update({
        where: { id: params.orderedIds[i] },
        data: { sortOrder: i + 1 },
      });
    }
  });
}

export async function moveChoiceItem(params: {
  organizationId: string;
  listId: string;
  itemId: string;
  direction: "up" | "down";
}) {
  await assertEditableList(params);
  const items = await prisma.guidanceChoiceItem.findMany({
    where: {
      listId: params.listId,
      isActive: true,
      organizationId: params.organizationId,
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = items.map((i) => i.id);
  const index = ids.indexOf(params.itemId);
  if (index < 0) throw new Error("انتخاب یافت نشد.");
  const swapWith = params.direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ids.length) return;
  const next = [...ids];
  const tmp = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = tmp;
  await reorderChoiceItems({
    organizationId: params.organizationId,
    listId: params.listId,
    orderedIds: next,
  });
}

export async function markListReady(params: {
  organizationId: string;
  listId: string;
  counselorUserId: string;
  reason?: string;
}) {
  const list = await prisma.guidanceChoiceList.findFirst({
    where: { id: params.listId, organizationId: params.organizationId },
  });
  if (!list) throw new Error("فهرست یافت نشد.");
  if (list.status === CHOICE_LIST_STATUS.CONFIRMED) {
    throw new Error("فهرست تأییدشده قابل تغییر نیست.");
  }

  const activeCount = await prisma.guidanceChoiceItem.count({
    where: { listId: list.id, isActive: true },
  });
  if (activeCount < 1) {
    throw new Error("دست‌کم یک انتخاب فعال برای اعلام آمادگی لازم است.");
  }

  const updated = await prisma.guidanceChoiceList.update({
    where: { id: list.id },
    data: {
      status: CHOICE_LIST_STATUS.READY,
      readyAt: new Date(),
      readyByUserId: params.counselorUserId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.counselorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidanceChoiceList",
      entityId: list.id,
      metadata: {
        kind: list.kind,
        version: list.version,
        ready: true,
        activeCount,
        reason: params.reason ?? null,
      },
    },
  });

  return updated;
}

export async function saveStudentFeedback(params: {
  organizationId: string;
  listId: string;
  itemId: string;
  studentUserId: string;
  verdict: string;
  note?: string;
}) {
  if (!isChoiceFeedbackVerdict(params.verdict)) {
    throw new Error("نوع بازخورد نامعتبر است.");
  }
  const list = await prisma.guidanceChoiceList.findFirst({
    where: {
      id: params.listId,
      organizationId: params.organizationId,
      kind: CHOICE_LIST_KIND.INITIAL,
      status: CHOICE_LIST_STATUS.READY,
    },
  });
  if (!list) throw new Error("فهرست آماده بررسی یافت نشد.");

  const item = await prisma.guidanceChoiceItem.findFirst({
    where: {
      id: params.itemId,
      listId: list.id,
      organizationId: params.organizationId,
      isActive: true,
    },
  });
  if (!item) throw new Error("انتخاب یافت نشد.");

  await prisma.guidanceChoiceFeedback.upsert({
    where: {
      listId_itemId_studentUserId: {
        listId: list.id,
        itemId: item.id,
        studentUserId: params.studentUserId,
      },
    },
    create: {
      organizationId: params.organizationId,
      listId: list.id,
      itemId: item.id,
      studentUserId: params.studentUserId,
      verdict: params.verdict,
      note: cleanText(params.note, 500) || null,
    },
    update: {
      verdict: params.verdict,
      note: cleanText(params.note, 500) || null,
    },
  });
}

export async function reviewStats(list: ChoiceListView) {
  const active = list.items.filter((i) => i.isActive);
  const reviewed = active.filter((i) => i.feedback?.verdict);
  const approved = active.filter((i) => i.feedback?.verdict === "approved");
  const needsReview = active.filter((i) => i.feedback?.verdict === "needs_review");
  const remove = active.filter((i) => i.feedback?.verdict === "remove");
  return {
    total: active.length,
    reviewed: reviewed.length,
    approved: approved.length,
    needsReview: needsReview.length,
    requestedRemoval: remove.length,
    remaining: active.length - reviewed.length,
  };
}

export function distribution(list: ChoiceListView) {
  const active = list.items.filter((i) => i.isActive);
  const count = (key: (item: ChoiceItemView) => string) => {
    const map = new Map<string, number>();
    for (const item of active) {
      const label = key(item).trim() || "نامشخص";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  };
  return {
    byProvince: count((i) => i.province || i.city),
    byMajor: count((i) => i.major),
    byEducationType: count((i) => i.educationTypeLabel),
  };
}

export async function confirmFinalList(params: {
  organizationId: string;
  listId: string;
  studentUserId: string;
  ackVersion: string;
}) {
  const list = await prisma.guidanceChoiceList.findFirst({
    where: {
      id: params.listId,
      organizationId: params.organizationId,
      kind: CHOICE_LIST_KIND.FINAL,
      status: CHOICE_LIST_STATUS.READY,
    },
  });
  if (!list) throw new Error("نسخه نهایی آماده تأیید یافت نشد.");

  const view = await loadChoiceListView({
    organizationId: params.organizationId,
    planId: list.planId,
    kind: CHOICE_LIST_KIND.FINAL,
  });
  if (!view) throw new Error("فهرست نهایی یافت نشد.");
  const confirmationHash = hashChoiceList(view.items);

  return prisma.guidanceChoiceList.update({
    where: { id: list.id },
    data: {
      status: CHOICE_LIST_STATUS.CONFIRMED,
      confirmedAt: new Date(),
      confirmationHash,
      ackVersion: params.ackVersion,
    },
  });
}

export async function supervisorReopenFinal(params: {
  organizationId: string;
  planId: string;
  studentId: string;
  counselorUserId: string;
}) {
  const current = await loadListRow({
    organizationId: params.organizationId,
    planId: params.planId,
    kind: CHOICE_LIST_KIND.FINAL,
  });
  if (!current) throw new Error("فهرست نهایی یافت نشد.");

  await prisma.guidanceChoiceList.update({
    where: { id: current.id },
    data: { status: CHOICE_LIST_STATUS.SUPERSEDED },
  });

  return copyList({
    sourceListId: current.id,
    organizationId: params.organizationId,
    planId: params.planId,
    studentId: params.studentId,
    counselorUserId: params.counselorUserId,
    kind: CHOICE_LIST_KIND.FINAL,
  });
}

export async function loadFeedbackMappedToFinal(params: {
  organizationId: string;
  planId: string;
}) {
  const initial = await loadChoiceListView({
    organizationId: params.organizationId,
    planId: params.planId,
    kind: CHOICE_LIST_KIND.INITIAL,
    includeInactive: true,
  });
  const finalList = await loadChoiceListView({
    organizationId: params.organizationId,
    planId: params.planId,
    kind: CHOICE_LIST_KIND.FINAL,
    includeInactive: true,
  });
  if (!finalList) return { list: null as ChoiceListView | null, fromInitial: initial };

  const initialFeedback = new Map(
    (initial?.items ?? []).map((i) => [i.id, i.feedback] as const),
  );
  return {
    fromInitial: initial,
    list: {
      ...finalList,
      items: finalList.items.map((item) => ({
        ...item,
        feedback: item.sourceItemId
          ? initialFeedback.get(item.sourceItemId) ?? item.feedback
          : item.feedback,
      })),
    },
  };
}

export type { ChoiceBandId };
