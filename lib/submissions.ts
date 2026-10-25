import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { parseFields, isInput } from "@/lib/forms/types";
import { toEn } from "@/lib/format";

/** Short tracking code shown to the visitor after submitting (last 6 chars of the id). */
export const submissionRef = (id: string) => id.slice(-6).toUpperCase();

export type SubFilters = { form?: string; status?: string; q?: string; period?: string; page?: string; pay?: string };
export const PAY_FILTERS = { paid: "پرداخت‌شده", unpaid: "پرداخت‌نشده", free: "رایگان" } as const;
export const PAY_STATE: Record<string, { label: string; cls: string }> = {
  NONE: { label: "رایگان", cls: "bg-line text-muted" },
  PENDING: { label: "در انتظار پرداخت", cls: "bg-amber-50 text-amber-800" },
  PAID: { label: "پرداخت‌شده", cls: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "پرداخت ناموفق", cls: "bg-gc-soft text-gc" },
};
const STATUSES = ["NEW", "CONTACTED", "ENROLLED", "ARCHIVED"] as const;

export function buildWhere(f: SubFilters): Prisma.SubmissionWhereInput {
  const where: Prisma.SubmissionWhereInput = {};
  if (f.form) where.formId = f.form;
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) where.status = f.status as (typeof STATUSES)[number];
  else if (!f.status) where.status = { not: "ARCHIVED" };
  if (f.pay === "paid") where.payState = "PAID";
  else if (f.pay === "unpaid") where.payState = { in: ["PENDING", "FAILED"] };
  else if (f.pay === "free") where.payState = "NONE";
  const days = { today: 1, "7": 7, "30": 30, "90": 90 }[f.period ?? ""];
  if (days) where.createdAt = { gte: new Date(Date.now() - days * 864e5) };
  return where;
}

/** IDs whose JSON data contains q (simple text search on data::text). */
export async function searchIds(raw: string): Promise<string[]> {
  const q = raw.trim();
  const en = toEn(q);
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Submission" WHERE data::text ILIKE ${"%" + q + "%"} OR data::text ILIKE ${"%" + en + "%"} OR coalesce(note,'') ILIKE ${"%" + q + "%"} OR upper(right(id, 6)) = ${en.toUpperCase()} LIMIT 5000`;
  return rows.map((r) => r.id);
}

export async function querySubmissions(f: SubFilters, take?: number, skip?: number) {
  const where = buildWhere(f);
  if (f.q?.trim()) where.OR = [{ id: { in: await searchIds(f.q.trim()) } }];
  const [items, total] = await Promise.all([
    prisma.submission.findMany({ where, orderBy: { createdAt: "desc" }, take, skip, include: { form: { select: { id: true, title: true, fields: true } }, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, refNumber: true, trackId: true, cardNumber: true } } } }),
    prisma.submission.count({ where }),
  ]);
  return { items, total };
}

/** Ordered column list: union of current form field labels (+ old labels in snapshots). */
export function columnsFor(items: { form: { fields: unknown }; labels: unknown; data: unknown }[], formFields?: unknown) {
  const cols = new Map<string, string>();
  const skip = new Set<string>();
  const addForm = (raw: unknown) => {
    for (const fd of parseFields(raw)) {
      if (!isInput(fd)) skip.add(fd.id);
      else if (!cols.has(fd.id)) cols.set(fd.id, fd.label);
    }
  };
  if (formFields) addForm(formFields);
  for (const it of items) {
    if (!formFields) addForm(it.form.fields);
    const labels = (it.labels ?? {}) as Record<string, string>;
    for (const k of Object.keys((it.data ?? {}) as object)) if (!cols.has(k) && !skip.has(k) && !k.startsWith("__")) cols.set(k, labels[k] ?? k);
  }
  return [...cols].map(([id, label]) => ({ id, label }));
}
