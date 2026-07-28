/**
 * Experience block media roles (IDs stored in ExperienceBlockMedia, not config JSON).
 */

export type BlockMediaRole = "primary" | "mobile" | "background";

export type BlockMediaLinkInput = {
  role: BlockMediaRole;
  mediaId: string;
  sortOrder: number;
};

export type ResolvedBlockMedia = {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
};

export type BlockMediaMap = Partial<Record<BlockMediaRole, ResolvedBlockMedia>>;

export function extractMediaLinksForRoles(
  roles: readonly BlockMediaRole[],
  formMedia: Partial<Record<BlockMediaRole, string | null>>,
): BlockMediaLinkInput[] {
  const links: BlockMediaLinkInput[] = [];
  roles.forEach((role, index) => {
    const mediaId = formMedia[role]?.trim();
    if (mediaId) {
      links.push({ role, mediaId, sortOrder: index });
    }
  });
  return links;
}
