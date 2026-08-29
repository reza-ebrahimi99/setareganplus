import { prisma } from "@/lib/prisma";

export const DEFAULT_BRANCH_SLUG = "nasim-shahr" as const;

export type ResolvedBranch = {
  id: string;
  slug: string;
  name: string;
};

/**
 * Resolves FormSubmission.branchId without inventing IDs.
 * 1) Prefer Form.branchId when set and still active
 * 2) Otherwise use seeded default branch slug `nasim-shahr`
 */
export async function resolveSubmissionBranch(params: {
  organizationId: string;
  formBranchId: string | null;
}): Promise<ResolvedBranch | null> {
  if (params.formBranchId) {
    const formBranch = await prisma.branch.findFirst({
      where: {
        id: params.formBranchId,
        organizationId: params.organizationId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, slug: true, name: true },
    });

    if (formBranch) {
      return formBranch;
    }
  }

  const defaultBranch = await prisma.branch.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: DEFAULT_BRANCH_SLUG,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true, slug: true, name: true },
  });

  return defaultBranch;
}
