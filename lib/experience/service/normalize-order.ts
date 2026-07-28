import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function normalizeExperienceBlockSortOrders(
  tx: Tx,
  organizationId: string,
  experienceVersionId: string,
): Promise<void> {
  const blocks = await tx.experienceBlock.findMany({
    where: {
      organizationId,
      experienceVersionId,
      deletedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const updates: Array<Promise<unknown>> = [];
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i].sortOrder !== i) {
      updates.push(
        tx.experienceBlock.update({
          where: { id: blocks[i].id },
          data: { sortOrder: i },
        }),
      );
    }
  }
  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

export async function nextExperienceBlockSortOrder(
  tx: Tx,
  organizationId: string,
  experienceVersionId: string,
): Promise<number> {
  const last = await tx.experienceBlock.findFirst({
    where: {
      organizationId,
      experienceVersionId,
      deletedAt: null,
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

/**
 * Assign deterministic 0..n-1 sortOrder for the given ordered block ids.
 * Missing or extra ids → caller must validate first.
 */
export async function applyExperienceBlockOrder(
  tx: Tx,
  organizationId: string,
  experienceVersionId: string,
  orderedBlockIds: string[],
): Promise<void> {
  await Promise.all(
    orderedBlockIds.map((blockId, index) =>
      tx.experienceBlock.updateMany({
        where: {
          id: blockId,
          organizationId,
          experienceVersionId,
          deletedAt: null,
        },
        data: { sortOrder: index },
      }),
    ),
  );
}
