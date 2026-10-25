import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Form } from "@/generated/prisma/client";
import { parseFields } from "./types";
import type { FormState, PublicForm } from "./public-types";

export type { PublicForm } from "./public-types";

/** Unpaid registrations hold a seat for this long. */
export const HOLD_MS = 30 * 60_000;

/** Seats taken: free + paid + recent pending payments. */
export async function seatsTaken(formId: string, excludeId?: string): Promise<number> {
  return prisma.submission.count({
    where: {
      formId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      OR: [{ payState: { in: ["NONE", "PAID"] } }, { payState: "PENDING", createdAt: { gte: new Date(Date.now() - HOLD_MS) } }],
    },
  });
}

export async function formState(f: Pick<Form, "id" | "status" | "opensAt" | "closesAt" | "capacity">, now = new Date()): Promise<{ state: FormState; remaining: number | null }> {
  if (f.status === "CLOSED") return { state: "closed", remaining: null };
  if (f.closesAt && f.closesAt <= now) return { state: "closed", remaining: null };
  if (f.opensAt && f.opensAt > now) return { state: "soon", remaining: f.capacity ?? null };
  if (f.capacity != null) {
    const remaining = Math.max(0, f.capacity - (await seatsTaken(f.id)));
    return { state: remaining > 0 ? "open" : "full", remaining };
  }
  return { state: "open", remaining: null };
}

export async function toPublic(f: Form): Promise<PublicForm> {
  const { state, remaining } = await formState(f);
  const discounts = f.payMode !== "FREE" ? await prisma.formDiscount.count({ where: { formId: f.id, active: true } }) : 0;
  return {
    slug: f.slug,
    title: f.title,
    description: f.description,
    fields: parseFields(f.fields),
    submitLabel: f.submitLabel,
    successMessage: f.successMessage,
    successTitle: f.successTitle,
    successRedirect: f.successRedirect,
    coverImage: f.coverImage,
    logo: f.logo,
    theme: f.theme,
    payMode: f.payMode,
    basePriceRials: f.basePriceRials,
    hasDiscounts: discounts > 0,
    state,
    opensAt: f.opensAt?.toISOString() ?? null,
    closesAt: f.closesAt?.toISOString() ?? null,
    capacity: f.capacity,
    remaining,
  };
}

/** Published (or explicitly closed) form by slug; drafts are never public. */
export const getPublicForm = cache(async (slug: string): Promise<PublicForm | null> => {
  const f = await prisma.form.findUnique({ where: { slug } });
  if (!f || f.status === "DRAFT") return null;
  return toPublic(f);
});

/** Forms for /forms and the home page. */
export async function listedForms(take?: number): Promise<PublicForm[]> {
  const rows = await prisma.form.findMany({ where: { status: "PUBLISHED", listed: true }, orderBy: [{ updatedAt: "desc" }], take: take ? take * 2 : undefined });
  const all = await Promise.all(rows.map(toPublic));
  // open ones first, then "soon", then full/closed
  const rank = { open: 0, soon: 1, full: 2, closed: 3 } as const;
  const sorted = all.filter((f) => f.state !== "closed").sort((a, b) => rank[a.state ?? "open"] - rank[b.state ?? "open"]);
  return take ? sorted.slice(0, take) : sorted;
}

/** Slugs used by our own routes under /f/. */
export const RESERVED_SLUGS = ["pay", "r", "receipt", "new"];
