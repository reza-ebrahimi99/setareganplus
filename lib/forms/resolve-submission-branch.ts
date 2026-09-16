import { prisma } from "@/lib/prisma";

const PREFERRED_DEFAULT_BRANCH_SLUGS = [
  "pesaran-ghalamchi",
  "dokhtaran-ghalamchi",
  "dabestan-setaregan",
] as const;

export type ResolvedBranch = {
  id: string;
  slug: string;
  name: string;
};

export async function resolveSubmissionBranch(params: {
  organizationId: string;
  formBranchId: string | null;
}): Promise<ResolvedBranch | null> {
  const select = { id: true, slug: true, name: true } as const;

  if (params.formBranchId) {
    const formBranch = await prisma.branch.findFirst({
      where: {
        id: params.formBranchId,
        organizationId: params.organizationId,
        deletedAt: null,
        isActive: true,
      },
      select,
    });

    if (formBranch) {
      return formBranch;
    }
  }

  for (const slug of PREFERRED_DEFAULT_BRANCH_SLUGS) {
    const preferredBranch = await prisma.branch.findFirst({
      where: {
        organizationId: params.organizationId,
        slug,
        deletedAt: null,
        isActive: true,
      },
      select,
    });

    if (preferredBranch) {
      return preferredBranch;
    }
  }

  return prisma.branch.findFirst({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select,
  });
}
