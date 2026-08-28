import { prisma } from "@/lib/prisma";
import { slugifyName } from "@/lib/books/catalog/taxonomy";

/** Reuses the existing generic Tag model — never a duplicate BookTag master. */
export async function resolveOrCreateTags(params: {
  organizationId: string;
  names: readonly string[];
}): Promise<string[]> {
  const cleaned = Array.from(
    new Set(
      params.names
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && name.length <= 60),
    ),
  );
  if (cleaned.length === 0) return [];

  const ids: string[] = [];
  for (const name of cleaned) {
    const slug = slugifyName(name);
    const tag = await prisma.tag.upsert({
      where: { organizationId_slug: { organizationId: params.organizationId, slug } },
      update: {},
      create: { organizationId: params.organizationId, slug, name },
      select: { id: true },
    });
    ids.push(tag.id);
  }
  return ids;
}

export async function replaceSkuTags(params: {
  organizationId: string;
  skuId: string;
  tagIds: readonly string[];
}): Promise<void> {
  await prisma.bookSkuTag.deleteMany({
    where: { organizationId: params.organizationId, skuId: params.skuId },
  });
  if (params.tagIds.length === 0) return;
  await prisma.bookSkuTag.createMany({
    data: params.tagIds.map((tagId) => ({
      organizationId: params.organizationId,
      skuId: params.skuId,
      tagId,
    })),
    skipDuplicates: true,
  });
}
