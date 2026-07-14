/**
 * Public / presentation organization resolver by slug.
 * Used ONLY by public form routes — not for admin authorization.
 *
 * Admin Form Builder must use getAuthenticatedOrganization() / requireAdminSession().
 */
import { prisma } from "@/lib/prisma";

export const PUBLIC_ORGANIZATION_SLUG = "setareganplus" as const;

/** @deprecated Prefer PUBLIC_ORGANIZATION_SLUG for public routes. */
export const MVP_ORGANIZATION_SLUG = PUBLIC_ORGANIZATION_SLUG;

export type CurrentOrganization = {
  id: string;
  slug: string;
  name: string;
};

export async function getPublicOrganizationBySlug(
  slug: string = PUBLIC_ORGANIZATION_SLUG,
): Promise<CurrentOrganization> {
  const organization = await prisma.organization.findFirst({
    where: {
      slug,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!organization) {
    throw new Error(
      `Organization with slug "${slug}" was not found. Run database seed before using public forms.`,
    );
  }

  return organization;
}

/**
 * @deprecated Admin code must use getAuthenticatedOrganization().
 * Kept as an alias for public form loaders during the transition.
 */
export async function getCurrentOrganization(): Promise<CurrentOrganization> {
  return getPublicOrganizationBySlug();
}
