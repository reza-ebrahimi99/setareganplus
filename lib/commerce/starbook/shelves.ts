/**
 * Pure StarBook shelf math. Safe for client components — no Prisma.
 */

export type StarBookShelfProduct = {
  id: string;
  subject: string | null;
  gradeLabel: string | null;
  categorySlug: string | null;
  isFeatured: boolean;
  updatedAt: Date;
  pricing: { isOnSale: boolean };
};

const WEEK_MS = 14 * 24 * 60 * 60 * 1000;

export function partitionStarBookShelves<T extends StarBookShelfProduct>(
  products: readonly T[],
) {
  const featured = products.filter((item) => item.isFeatured).slice(0, 8);
  const flash = products.filter((item) => item.pricing.isOnSale).slice(0, 8);
  const newest = [...products]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8);
  const trending = [...products]
    .sort((a, b) => {
      const score = (item: T) =>
        (item.isFeatured ? 4 : 0) +
        (item.pricing.isOnSale ? 3 : 0) +
        (item.updatedAt.getTime() > Date.now() - WEEK_MS ? 2 : 0);
      return score(b) - score(a);
    })
    .slice(0, 10);
  const bestsellers = (featured.length ? featured : trending).slice(0, 8);
  return { featured, flash, newest, trending, bestsellers };
}

export function relatedStarBookProducts<T extends StarBookShelfProduct>(
  product: T,
  catalog: readonly T[],
  limit = 6,
) {
  return catalog
    .filter((item) => item.id !== product.id)
    .sort((a, b) => {
      const score = (item: T) =>
        (item.subject && item.subject === product.subject ? 4 : 0) +
        (item.gradeLabel && item.gradeLabel === product.gradeLabel ? 3 : 0) +
        (item.categorySlug && item.categorySlug === product.categorySlug ? 2 : 0) +
        (item.isFeatured ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export function recommendStarBookProducts<T extends StarBookShelfProduct>(
  recentIds: readonly string[],
  catalog: readonly T[],
  limit = 8,
) {
  const recent = recentIds
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is T => Boolean(item));
  if (recent.length === 0) {
    return catalog.filter((item) => item.isFeatured).slice(0, limit);
  }
  const subjects = new Set(recent.map((item) => item.subject).filter(Boolean));
  const grades = new Set(recent.map((item) => item.gradeLabel).filter(Boolean));
  const seen = new Set(recentIds);
  return catalog
    .filter((item) => !seen.has(item.id))
    .sort((a, b) => {
      const score = (item: T) =>
        (item.subject && subjects.has(item.subject) ? 4 : 0) +
        (item.gradeLabel && grades.has(item.gradeLabel) ? 3 : 0) +
        (item.isFeatured ? 2 : 0) +
        (item.pricing.isOnSale ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}
