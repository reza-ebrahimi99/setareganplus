import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type CatalogFilter = { q?: string; grade?: string; major?: string; center?: string };

export async function bestsellerIds(limit = 3): Promise<Set<string>> {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { payStatus: "PAID" } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
    take: limit,
  });
  return new Set(rows.filter((r) => (r._sum.qty ?? 0) >= 3).map((r) => r.productId!));
}

export async function listProducts(f: CatalogFilter = {}, take?: number) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (f.grade) where.grade = f.grade;
  if (f.major) where.OR = [{ majors: { has: f.major } }, { majors: { isEmpty: true } }];
  if (f.center) where.AND = [{ OR: [{ center: f.center }, { center: null }] }];
  if (f.q?.trim()) {
    const q = f.q.trim();
    where.AND = [
      ...((where.AND as Prisma.ProductWhereInput[]) ?? []),
      { OR: [{ title: { contains: q, mode: "insensitive" } }, { author: { contains: q, mode: "insensitive" } }, { subject: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }] },
    ];
  }
  const [items, best] = await Promise.all([
    prisma.product.findMany({ where, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }], take }),
    bestsellerIds(),
  ]);
  return items.map((p) => ({ ...p, badges: badgesFor(p, best) }));
}

export type Badge = "new" | "best" | "out" | "sale";
export function badgesFor(p: { id: string; createdAt: Date; stock: number | null; featured: boolean; compareAtRials: number | null; priceRials: number }, best: Set<string>): Badge[] {
  const out: Badge[] = [];
  if (p.stock === 0) out.push("out");
  if (best.has(p.id) || p.featured) out.push("best");
  if (Date.now() - p.createdAt.getTime() < 30 * 864e5) out.push("new");
  if (p.compareAtRials && p.compareAtRials > p.priceRials) out.push("sale");
  return out;
}

export async function catalogFacets() {
  const rows = await prisma.product.findMany({ where: { active: true }, select: { grade: true, majors: true, center: true } });
  return {
    grades: [...new Set(rows.map((r) => r.grade).filter(Boolean))] as string[],
    majors: [...new Set(rows.flatMap((r) => r.majors))],
    centers: [...new Set(rows.map((r) => r.center).filter(Boolean))] as string[],
  };
}
