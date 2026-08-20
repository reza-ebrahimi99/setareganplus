/**
 * Canonical booklet operations branches for SetareganPlus.
 * Identity is bookletOpsKey / slug — display names live in the database.
 */

export const COMMERCE_BOOKLET_BRANCH_KEYS = [
  "BOYS",
  "GIRLS",
  "ELEMENTARY",
] as const;

export type CommerceBookletBranchKeyValue =
  (typeof COMMERCE_BOOKLET_BRANCH_KEYS)[number];

export const COMMERCE_BOOKLET_BRANCH_CATALOG: Record<
  CommerceBookletBranchKeyValue,
  {
    slug: string;
    name: string;
    shortName: string;
    address: string;
    accentColor: string;
  }
> = {
  BOYS: {
    slug: "pesaran-ghalamchi",
    name: "شعبه پسران قلم چی نسیم شهر",
    shortName: "شعبه پسران قلم چی",
    address: "بین کلانتری و بانک مسکن",
    accentColor: "#2563eb",
  },
  GIRLS: {
    slug: "dokhtaran-ghalamchi",
    name: "شعبه دختران قلم چی نسیم شهر",
    shortName: "شعبه دختران قلم چی",
    address: "کوچه پاییزان",
    accentColor: "#7c3aed",
  },
  ELEMENTARY: {
    slug: "dabestan-setaregan",
    name: "دبستان ستارگان",
    shortName: "دبستان ستارگان",
    address: "بین خیابان اول و دوم",
    accentColor: "#0d9488",
  },
};

export const COMMERCE_BOOKLET_BRANCH_KPI_LABELS: Record<
  CommerceBookletBranchKeyValue,
  string
> = {
  BOYS: "سفارش شعبه پسران",
  GIRLS: "سفارش شعبه دختران",
  ELEMENTARY: "سفارش دبستان",
};

export function isCommerceBookletBranchKey(
  value: string | null | undefined,
): value is CommerceBookletBranchKeyValue {
  return (
    typeof value === "string" &&
    (COMMERCE_BOOKLET_BRANCH_KEYS as readonly string[]).includes(value)
  );
}
