/**
 * Category tree validation helpers (pure — no DB).
 */

export type CategoryNodeLike = {
  id: string;
  parentId: string | null;
  slug: string;
  deletedAt?: Date | null;
};

export class CommerceCategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceCategoryValidationError";
  }
}

export function assertValidCategoryParent(params: {
  categoryId?: string | null;
  parentId: string | null;
  existing: readonly CategoryNodeLike[];
}): void {
  const { categoryId, parentId, existing } = params;
  if (parentId == null) return;

  if (categoryId && parentId === categoryId) {
    throw new CommerceCategoryValidationError(
      "دسته‌بندی نمی‌تواند والد خودش باشد.",
    );
  }

  const byId = new Map(existing.map((row) => [row.id, row]));
  if (!byId.has(parentId)) {
    throw new CommerceCategoryValidationError("دسته والد یافت نشد.");
  }

  if (!categoryId) return;

  // Walk ancestors of parent; if we hit categoryId, moving would create a cycle.
  let cursor: string | null = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === categoryId) {
      throw new CommerceCategoryValidationError(
        "ارجاع حلقه‌ای در درخت دسته‌بندی مجاز نیست.",
      );
    }
    if (seen.has(cursor)) {
      throw new CommerceCategoryValidationError(
        "درخت دسته‌بندی نامعتبر است (حلقه موجود).",
      );
    }
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
}

export function assertUniqueCategorySlug(params: {
  slug: string;
  excludeId?: string | null;
  existing: readonly CategoryNodeLike[];
}): void {
  const slug = params.slug.trim();
  if (!slug) {
    throw new CommerceCategoryValidationError("اسلاگ دسته‌بندی الزامی است.");
  }
  const conflict = params.existing.find(
    (row) =>
      row.slug === slug &&
      row.id !== params.excludeId &&
      (row.deletedAt == null || row.deletedAt === undefined),
  );
  if (conflict) {
    throw new CommerceCategoryValidationError(
      "اسلاگ دسته‌بندی در این سازمان تکراری است.",
    );
  }
}

/**
 * Pure seed plan used by migration SQL and idempotency tests.
 * Returns rows that would be inserted given already-present seedKeys.
 */
export function planCategorySeedInserts(params: {
  organizationId: string;
  existingSeedKeys: ReadonlySet<string>;
  definitions: readonly {
    seedKey: string;
    title: string;
    slug: string;
    sortOrder: number;
    parentSeedKey?: string;
  }[];
}): Array<{
  seedKey: string;
  title: string;
  slug: string;
  sortOrder: number;
  parentSeedKey: string | null;
}> {
  const planned: Array<{
    seedKey: string;
    title: string;
    slug: string;
    sortOrder: number;
    parentSeedKey: string | null;
  }> = [];

  for (const def of params.definitions) {
    if (params.existingSeedKeys.has(def.seedKey)) continue;
    if (def.parentSeedKey) {
      const parentPresent =
        params.existingSeedKeys.has(def.parentSeedKey) ||
        planned.some((row) => row.seedKey === def.parentSeedKey);
      if (!parentPresent) {
        throw new CommerceCategoryValidationError(
          `Parent seed "${def.parentSeedKey}" missing for "${def.seedKey}".`,
        );
      }
    }
    planned.push({
      seedKey: def.seedKey,
      title: def.title,
      slug: def.slug,
      sortOrder: def.sortOrder,
      parentSeedKey: def.parentSeedKey ?? null,
    });
  }

  return planned;
}
