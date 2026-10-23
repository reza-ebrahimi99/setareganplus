import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { parseFields } from "@/lib/forms/types";
import { toEn } from "@/lib/format";

/** Short tracking code shown to the visitor after submitting (last 6 chars of the id). */
export const submissionRef = (id: string) => id.slice(-6).toUpperCase();

export type SubFilters = { form?: string; status?: string; q?: string; period?: string; page?: string };
const STATUSES = ["NEW", "CONTACTED", "ENROLLED", "ARCHIVED"] as const;

export function buildWhere(f: SubFilters): Prisma.SubmissionWhereInput {
  const where: Prisma.SubmissionWhereInput = {};
  if (f.form) where.formId = f.form;
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) where.status = f.status as (typeof STATUSES)[number];
  else if (!f.status) where.status = { not: "ARCHIVED" };
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
    prisma.submission.findMany({ where, orderBy: { createdAt: "desc" }, take, skip, include: { form: { select: { id: true, title: true, fields: true } } } }),
    prisma.submission.count({ where }),
  ]);
  return { items, total };
}

/** Ordered column list: union of current form field labels (+ old labels in snapshots). */
export function columnsFor(items: { form: { fields: unknown }; labels: unknown; data: unknown }[], formFields?: unknown) {
  const cols = new Map<string, string>();
  if (formFields) for (const fd of parseFields(formFields)) cols.set(fd.id, fd.label);
  for (const it of items) {
    if (!formFields) for (const fd of parseFields(it.form.fields)) if (!cols.has(fd.id)) cols.set(fd.id, fd.label);
    const labels = (it.labels ?? {}) as Record<string, string>;
    for (const k of Object.keys((it.data ?? {}) as object)) if (!cols.has(k)) cols.set(k, labels[k] ?? k);
  }
  return [...cols].map(([id, label]) => ({ id, label }));
}
