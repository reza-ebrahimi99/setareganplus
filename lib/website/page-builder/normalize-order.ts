/**
 * Normalize WebsitePageSection.sortOrder to 0..n-1 after moves/deletes.
 */

import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function normalizePageSectionSortOrders(
  tx: Tx,
  organizationId: string,
  pageId: string,
): Promise<void> {
  const sections = await tx.websitePageSection.findMany({
    where: { organizationId, pageId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });

  for (let i = 0; i < sections.length; i++) {
    if (sections[i].sortOrder !== i) {
      await tx.websitePageSection.update({
        where: { id: sections[i].id },
        data: { sortOrder: i },
      });
    }
  }
}

export async function nextSectionSortOrder(
  tx: Tx,
  organizationId: string,
  pageId: string,
): Promise<number> {
  const last = await tx.websitePageSection.findFirst({
    where: { organizationId, pageId, deletedAt: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}
