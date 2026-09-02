/**
 * Program encyclopedia — UI helpers (categories, filters, card projection).
 */

import type { DiscoverProgram, DiscoverProgramCategory } from "@/lib/guidance/discover/types";
import { programHref } from "@/lib/guidance/discover/catalog";

export const PROGRAM_CATEGORY_LABELS: Record<DiscoverProgramCategory, string> = {
  DEGREE_LEVEL: "مقاطع تحصیلی",
  INSTITUTION_TYPE: "نوع دوره و دانشگاه",
  ADMISSION_METHOD: "شیوه پذیرش",
  SPECIAL_CONDITION: "دوره‌ها و شرایط خاص",
};

export const PROGRAM_CATEGORY_ORDER: readonly DiscoverProgramCategory[] = [
  "DEGREE_LEVEL",
  "INSTITUTION_TYPE",
  "ADMISSION_METHOD",
  "SPECIAL_CONDITION",
];

export type ProgramExplorerCard = {
  slug: string;
  title: string;
  category: DiscoverProgramCategory;
  categoryLabel: string;
  summary: string;
  keyFacts: readonly string[];
  suitableHint: string;
  href: string;
};

export function toProgramExplorerCard(item: DiscoverProgram): ProgramExplorerCard {
  const keyFacts = [
    item.duration !== "—" ? item.duration : null,
    item.continuityType,
    item.admissionType !== "—" ? item.admissionType : null,
  ].filter((line): line is string => Boolean(line && line.length > 2));

  return {
    slug: item.slug,
    title: item.title,
    category: item.category,
    categoryLabel: PROGRAM_CATEGORY_LABELS[item.category],
    summary: item.summary,
    keyFacts: keyFacts.slice(0, 3),
    suitableHint: item.suitableFor.split(".")[0] ?? item.suitableFor,
    href: programHref(item.slug),
  };
}

export function filterProgramExplorerCards(
  cards: readonly ProgramExplorerCard[],
  programs: readonly DiscoverProgram[],
  query: string,
  category: DiscoverProgramCategory | "ALL",
): ProgramExplorerCard[] {
  const q = query.trim().toLocaleLowerCase("fa");
  const programBySlug = new Map(programs.map((item) => [item.slug, item]));

  return cards.filter((item) => {
    if (category !== "ALL" && item.category !== category) return false;
    if (!q) return true;
    const source = programBySlug.get(item.slug);
    const haystack = [
      item.title,
      item.summary,
      item.suitableHint,
      item.categoryLabel,
      ...(source?.searchTerms ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase("fa");
    return haystack.includes(q) || item.title.includes(query.trim());
  });
}

export function programCategoryAccent(category: DiscoverProgramCategory): {
  gradient: string;
  badge: string;
} {
  switch (category) {
    case "DEGREE_LEVEL":
      return {
        gradient: "linear-gradient(135deg, #4338ca 0%, #6366f1 48%, #818cf8 100%)",
        badge: "#4338ca",
      };
    case "INSTITUTION_TYPE":
      return {
        gradient: "linear-gradient(135deg, #0e7490 0%, #0891b2 48%, #22d3ee 100%)",
        badge: "#0e7490",
      };
    case "ADMISSION_METHOD":
      return {
        gradient: "linear-gradient(135deg, #b45309 0%, #d97706 48%, #fbbf24 100%)",
        badge: "#b45309",
      };
    case "SPECIAL_CONDITION":
      return {
        gradient: "linear-gradient(135deg, #be185d 0%, #db2777 48%, #f472b6 100%)",
        badge: "#be185d",
      };
  }
}
