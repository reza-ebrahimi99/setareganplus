import { prisma } from "@/lib/prisma";

/**
 * Temporary MVP organization resolver for Form Builder (Sprint 3.4B-1a).
 *
 * TODO(auth): Replace this slug-based lookup with authenticated
 * organization/session context (membership + role) before any production
 * exposure of admin Form Builder routes.
 *
 * Server-only: do not import from Client Components.
 */

export const MVP_ORGANIZATION_SLUG = "setareganplus" as const;

export type CurrentOrganization = {
  id: string;
  slug: string;
  name: string;
};

export async function getCurrentOrganization(): Promise<CurrentOrganization> {
  const organization = await prisma.organization.findFirst({
    where: {
      slug: MVP_ORGANIZATION_SLUG,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!organization) {
    throw new Error(
      `Organization with slug "${MVP_ORGANIZATION_SLUG}" was not found. Run database seed before using Form Builder.`,
    );
  }

  return organization;
}
