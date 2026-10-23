import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStage, Prisma } from "@/generated/prisma/client";
import { toEn } from "@/lib/format";
import { STAGES } from "./config";

export type OrderQuery = { stage?: string; branch?: string; range?: string; from?: string; to?: string; product?: string; q?: string; pay?: string; page?: string };

const DAY = 86_400_000;
const TEHRAN = 3.5 * 3_600_000;
/** Start of the Tehran day `daysAgo` days back, as a UTC Date. */
export function tehranDayStart(daysAgo = 0, now = Date.now()) {
  return new Date(Math.floor((now + TEHRAN) / DAY) * DAY - TEHRAN - daysAgo * DAY);
}

export const RANGES: Record<string, { label: string; days: number }> = {
  today: { label: "امروز", days: 0 },
  "7": { label: "۷ روز اخیر", days: 6 },
  "30": { label: "۳۰ روز اخیر", days: 29 },
  "90": { label: "۹۰ روز اخیر", days: 89 },
};

export function orderWhere(sp: OrderQuery): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (sp.stage === "todo") and.push({ stage: { in: ["PAID", "IN_PRODUCTION"] } });
  else if (sp.stage && (STAGES as readonly string[]).concat("CANCELLED").includes(sp.stage)) and.push({ stage: sp.stage as OrderStage });
  else if (!sp.stage) and.push({ OR: [{ payStatus: "PAID" }, { stage: { not: "REGISTERED" } }] }); // default: hide abandoned unpaid
  if (sp.pay === "unpaid") and.push({ payStatus: { not: "PAID" } });
  if (sp.branch) and.push({ branch: sp.branch });
  if (sp.product) and.push({ items: { some: { productId: sp.product } } });
  if (sp.range && RANGES[sp.range]) and.push({ createdAt: { gte: tehranDayStart(RANGES[sp.range].days) } });
  if (sp.q) {
    const q = toEn(sp.q.trim());
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { buyerName: { contains: sp.q.trim(), mode: "insensitive" } },
        { number: { contains: q.toUpperCase() } },
        { shortCode: q.toUpperCase() },
        ...(digits.length >= 4 ? [{ mobile: { contains: digits.replace(/^98/, "0") } }, { nationalCode: { contains: digits } }] : []),
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export const PAGE_SIZE = 50;
export async function queryOrders(sp: OrderQuery, all = false) {
  const where = orderWhere(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: all ? 5000 : PAGE_SIZE,
      skip: all ? 0 : (page - 1) * PAGE_SIZE,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Next step in the normal workflow. */
export function nextStage(s: OrderStage): OrderStage | null {
  const i = (STAGES as readonly string[]).indexOf(s);
  return i >= 0 && i < STAGES.length - 1 ? (STAGES[i + 1] as OrderStage) : null;
}

/** Finds an order from anything staff might scan/type: ticket URL, token, short code, order number, mobile. */
export async function findForPickup(raw: string) {
  const t = toEn(raw.trim());
  if (!t) return [];
  const m = t.match(/\/booklet\/([A-Za-z0-9_-]+)/) ?? t.match(/\/o\/([A-Za-z0-9]+)/);
  const key = m ? m[1] : t;
  const one = await prisma.order.findFirst({
    where: { OR: [{ qrToken: key }, { shortCode: key.toUpperCase() }, { number: key.toUpperCase() }] },
    include: { items: true },
  });
  if (one) return [one];
  const digits = t.replace(/\D/g, "");
  if (/^0?9\d{9}$/.test(digits)) {
    return prisma.order.findMany({ where: { mobile: digits.padStart(11, "0"), payStatus: "PAID" }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 10 });
  }
  return [];
}
