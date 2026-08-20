/**
 * Branch presentation for commerce ops — color comes from DB, never from gender.
 */

export type CommerceBranchBadge = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  accentColor: string;
  address: string | null;
  bookletOpsKey: "BOYS" | "GIRLS" | "ELEMENTARY" | null;
};

const FALLBACK_PALETTE = [
  "#7c3aed",
  "#2563eb",
  "#0d9488",
  "#c026d3",
  "#ea580c",
  "#4f46e5",
  "#0891b2",
  "#ca8a04",
] as const;

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

function isAccentColor(value: string | null | undefined): boolean {
  return Boolean(value && HEX_COLOR.test(value.trim()));
}

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function resolveBranchAccentColor(params: {
  slug: string;
  accentColor?: string | null;
}): string {
  if (isAccentColor(params.accentColor)) {
    return params.accentColor!.trim();
  }
  const index = hashSlug(params.slug) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index] ?? FALLBACK_PALETTE[0];
}

export function toCommerceBranchBadge(branch: {
  id: string;
  name: string;
  slug: string;
  accentColor?: string | null;
  address?: string | null;
  bookletOpsKey?: string | null;
}): CommerceBranchBadge {
  const shortName = branch.name
    .replace(" نسیم شهر", "")
    .replace("نسیم‌شهر", "")
    .trim();
  const key = branch.bookletOpsKey;
  return {
    id: branch.id,
    name: branch.name,
    shortName: shortName || branch.name,
    slug: branch.slug,
    accentColor: resolveBranchAccentColor(branch),
    address: branch.address?.trim() || null,
    bookletOpsKey:
      key === "BOYS" || key === "GIRLS" || key === "ELEMENTARY" ? key : null,
  };
}
