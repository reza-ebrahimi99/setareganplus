/**
 * Major encyclopedia — UI helpers (filter labels, card projection).
 * Data stays in DISCOVER_MAJORS; this file only shapes presentation.
 */

import type { DiscoverMajor } from "@/lib/guidance/discover/types";
import { majorHref } from "@/lib/guidance/discover/catalog";
import type { GuidanceExamGroup } from "@/lib/guidance/types";

export const MAJOR_EXAM_FILTER_LABELS: Record<GuidanceExamGroup, string> = {
  MATHEMATICS: "ریاضی",
  EXPERIMENTAL_SCIENCES: "تجربی",
  HUMANITIES: "انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان",
};

export type MajorExplorerCard = {
  slug: string;
  title: string;
  examGroup: GuidanceExamGroup;
  examGroupLabel: string;
  kicker: string;
  lead: string;
  suitableFor: string;
  href: string;
};

export function toMajorExplorerCard(item: DiscoverMajor): MajorExplorerCard {
  return {
    slug: item.slug,
    title: item.title,
    examGroup: item.examGroup,
    examGroupLabel: MAJOR_EXAM_FILTER_LABELS[item.examGroup],
    kicker: item.kicker,
    lead: item.lead,
    suitableFor: item.insight.succeeds,
    href: majorHref(item.slug),
  };
}

export function filterMajorExplorerCards(
  cards: readonly MajorExplorerCard[],
  query: string,
  examGroup: GuidanceExamGroup | "ALL",
): MajorExplorerCard[] {
  const q = query.trim().toLocaleLowerCase("fa");
  return cards.filter((item) => {
    if (examGroup !== "ALL" && item.examGroup !== examGroup) return false;
    if (!q) return true;
    const haystack = [item.title, item.kicker, item.lead, item.suitableFor]
      .join(" ")
      .toLocaleLowerCase("fa");
    return haystack.includes(q) || item.title.includes(query.trim());
  });
}

export function majorExamGroupAccent(group: GuidanceExamGroup): {
  gradient: string;
  badge: string;
} {
  switch (group) {
    case "MATHEMATICS":
      return {
        gradient: "linear-gradient(135deg, #4338ca 0%, #6366f1 48%, #818cf8 100%)",
        badge: "#4338ca",
      };
    case "EXPERIMENTAL_SCIENCES":
      return {
        gradient: "linear-gradient(135deg, #047857 0%, #059669 48%, #34d399 100%)",
        badge: "#047857",
      };
    case "HUMANITIES":
      return {
        gradient: "linear-gradient(135deg, #b45309 0%, #d97706 48%, #fbbf24 100%)",
        badge: "#b45309",
      };
    case "ARTS":
      return {
        gradient: "linear-gradient(135deg, #be185d 0%, #db2777 48%, #f472b6 100%)",
        badge: "#be185d",
      };
    case "LANGUAGES":
      return {
        gradient: "linear-gradient(135deg, #0e7490 0%, #0891b2 48%, #22d3ee 100%)",
        badge: "#0e7490",
      };
  }
}
