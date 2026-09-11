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
import { CHOICE_STUDIO_MAX_PARSE_ROWS } from "@/lib/guidance/choice-studio/types";
import { isChoiceBandId, isChoiceFeedbackVerdict } from "@/lib/guidance/journey-v2/labels";
import { mapSourceFeedback, nextRevisionSourceItemId } from "@/lib/guidance/journey-v2/choice-feedback-map";

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
  source?: string;
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
  updatedAtIso: string;
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
    source: cleanText(input.source, 20) || "MANUAL",
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

  const sourceIds = [
    ...new Set(
      items
        .map((item) => item.sourceItemId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const sourceFeedback =
    sourceIds.length > 0
      ? await prisma.guidanceChoiceFeedback.findMany({
          where: {
            organizationId: params.organizationId,
            itemId: { in: sourceIds },
          },
        })
      : [];
  const feedbackBySourceItem = new Map(sourceFeedback.map((f) => [f.itemId, f]));

  const mappedItems = items.map((item) => {
    const fb = feedbackByItem.get(item.id) ?? (item.sourceItemId
      ? feedbackBySourceItem.get(item.sourceItemId)
      : undefined);
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
  });

  return {
    id: list.id,
    kind: list.kind as ChoiceListKind,
    version: list.version,
    status: list.status,
    counselorUserId: list.counselorUserId,
    readyAtIso: list.readyAt?.toISOString() ?? null,
    confirmedAtIso: list.confirmedAt?.toISOString() ?? null,
    confirmationHash: list.confirmationHash,
    updatedAtIso: list.updatedAt.toISOString(),
    items: mappedItems,
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
          sourceItemId: nextRevisionSourceItemId(item),
        })),
      });
    }

    return list;
  });
}

function validateActiveItemsForPublish(
  items: Array<{
    officialCode: string | null;
    major: string;
    university: string;
    educationType: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  const active = items.filter((i) => i.isActive);
  if (active.length < 1) {
    throw new Error("دست‌کم یک انتخاب فعال برای انتشار لازم است.");
  }
  if (active.length > MAX_GUIDANCE_CHOICES) {
    throw new Error(
      `سقف عملیاتی سنجش ${MAX_GUIDANCE_CHOICES} انتخاب فعال است. ابتدا فهرست را کاهش دهید. هیچ ردیفی به‌صورت خودکار حذف نمی‌شود.`,
    );
  }
  const codes = new Map<string, number>();
  const orders = new Map<number, number>();
  for (const item of active) {
    if (!item.major.trim() || !item.university.trim()) {
      throw new Error("رشته و دانشگاه برای همه انتخاب‌های فعال الزامی است.");
    }
    if (!item.officialCode?.trim()) {
      throw new Error("کد رشته برای همه انتخاب‌های فعال الزامی است. کد را حدس نزنید.");
    }
    if (!item.educationType?.trim()) {
      throw new Error("نوع دوره برای همه انتخاب‌های فعال الزامی است.");
    }
    const code = item.officialCode.trim();
    codes.set(code, (codes.get(code) ?? 0) + 1);
    orders.set(item.sortOrder, (orders.get(item.sortOrder) ?? 0) + 1);
  }
  const dupCode = [...codes.entries()].find(([, n]) => n > 1);
  if (dupCode) {
    throw new Error(`کد رشته تکراری مانع انتشار است: ${dupCode[0]}`);
  }
  const dupOrder = [...orders.entries()].find(([, n]) => n > 1);
  if (dupOrder) {
    throw new Error("اولویت تکراری در فهرست فعال وجود دارد.");
  }
}

export async function importChoiceRows(params: {
  organizationId: string;
  planId: string;
  studentId: string;
  counselorUserId: string;
  kind: ChoiceListKind;
  items: ChoiceItemInput[];
  replaceReady?: boolean;
}) {
  if (params.items.length < 1) {
    throw new Error("هیچ ردیف معتبری برای ورود وجود ندارد.");
  }
  if (params.items.length > CHOICE_STUDIO_MAX_PARSE_ROWS) {
    throw new Error("تعداد ردیف‌ها از سقف ایمنی استودیو بیشتر است.");
  }

  let list = await loadListRow({
    organizationId: params.organizationId,
    planId: params.planId,
    kind: params.kind,
  });

  if (list?.status === CHOICE_LIST_STATUS.CONFIRMED) {
    throw new Error("فهرست تأییدشده قفل است. بازگشایی فقط با ناظر ممکن است.");
  }

  if (list?.status === CHOICE_LIST_STATUS.READY) {
    if (!params.replaceReady) {
      throw new Error(
        "نسخه منتشرشده را نمی‌توان بی‌سروصدا بازنویسی کرد. برای ساخت نسخه جدید پیش‌نویس تأیید کنید.",
      );
    }
    await prisma.guidanceChoiceList.update({
      where: { id: list.id },
      data: { status: CHOICE_LIST_STATUS.SUPERSEDED },
    });
    list = null;
  }

  if (!list) {
    list = await ensureWorkingList({
      organizationId: params.organizationId,
      planId: params.planId,
      studentId: params.studentId,
      counselorUserId: params.counselorUserId,
      kind: params.kind,
    });
  }

  const target = list;
  const normalized = params.items.map((input) =>
    normalizeItem({ ...input, source: input.source || "EXCEL" }),
  );

  await prisma.$transaction(async (tx) => {
    const feedbackCount = await tx.guidanceChoiceFeedback.count({
      where: { listId: target.id },
    });
    if (feedbackCount === 0) {
      await tx.guidanceChoiceItem.deleteMany({ where: { listId: target.id } });
    } else {
      await tx.guidanceChoiceItem.updateMany({
        where: { listId: target.id },
        data: { isActive: false },
      });
    }
    if (normalized.length > 0) {
      await tx.guidanceChoiceItem.createMany({
        data: normalized.map((item, index) => ({
          organizationId: params.organizationId,
          listId: target.id,
          sortOrder: index + 1,
          ...item,
        })),
      });
    }
    await tx.guidanceChoiceList.update({
      where: { id: target.id },
      data: { counselorUserId: params.counselorUserId },
    });
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.counselorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidanceChoiceList",
      entityId: target.id,
      metadata: {
        kind: target.kind,
        version: target.version,
        imported: true,
        count: normalized.length,
        source: "EXCEL",
      },
    },
  });

  return target;
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
  if (list.status === CHOICE_LIST_STATUS.READY) {
    throw new Error(
      list.kind === CHOICE_LIST_KIND.FINAL
        ? "نسخه منتشرشده قفل است. برای اصلاح، یک پیش‌نویس جدید از روی آن بسازید."
        : "نسخه اولیه پس از اعلام آمادگی قفل است. اصلاحات در مرحله نهایی انجام می‌شود.",
    );
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

export async function restoreChoiceItem(params: {
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
  if (item.isActive) return item;
  const activeCount = await prisma.guidanceChoiceItem.count({
    where: { listId: params.listId, isActive: true },
  });
  if (activeCount >= MAX_GUIDANCE_CHOICES) {
    throw new Error(`حداکثر ${MAX_GUIDANCE_CHOICES} انتخاب فعال مجاز است.`);
  }
  return prisma.guidanceChoiceItem.update({
    where: { id: item.id },
    data: { isActive: true },
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
  if (list.status === CHOICE_LIST_STATUS.READY) {
    return list;
  }

  const publishItems = await prisma.guidanceChoiceItem.findMany({
    where: { listId: list.id, organizationId: params.organizationId },
    select: {
      officialCode: true,
      major: true,
      university: true,
      educationType: true,
      sortOrder: true,
      isActive: true,
    },
  });
  validateActiveItemsForPublish(publishItems);
  const activeCount = publishItems.filter((i) => i.isActive).length;

  if (list.kind === CHOICE_LIST_KIND.FINAL) {
    await prisma.guidanceChoiceList.updateMany({
      where: {
        organizationId: params.organizationId,
        planId: list.planId,
        kind: CHOICE_LIST_KIND.FINAL,
        id: { not: list.id },
        status: {
          in: [CHOICE_LIST_STATUS.DRAFT, CHOICE_LIST_STATUS.READY],
        },
      },
      data: { status: CHOICE_LIST_STATUS.SUPERSEDED },
    });
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
  const proposedMoves = active.filter(
    (i) => i.feedback?.verdict === "less" || i.feedback?.verdict === "more",
  );
  return {
    total: active.length,
    reviewed: reviewed.length,
    approved: approved.length,
    needsReview: needsReview.length,
    requestedRemoval: remove.length,
    proposedMoves: proposedMoves.length,
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

export async function revisePublishedFinalList(params: {
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
  if (current.status === CHOICE_LIST_STATUS.CONFIRMED) {
    throw new Error("فهرست تأییدشده قفل است. بازگشایی فقط با ناظر ممکن است.");
  }
  if (current.status !== CHOICE_LIST_STATUS.READY) {
    throw new Error("پیش‌نویس نسخه اصلاح‌شده از قبل باز است.");
  }

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

  return {
    fromInitial: initial,
    list: {
      ...finalList,
      items: mapSourceFeedback(finalList.items, initial?.items ?? []),
    },
  };
}

export type { ChoiceBandId };
