/**
 * Discovery Center catalog helpers — search, related links, indexes.
 * Pure. No Prisma.
 */

import { DISCOVER_MAJORS } from "@/lib/guidance/discover/majors";
import { DISCOVER_PATHWAYS } from "@/lib/guidance/discover/pathways";
import { DISCOVER_PROGRAMS } from "@/lib/guidance/discover/programs";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import type {
  DiscoverKind,
  DiscoverMajor,
  DiscoverRelated,
  DiscoverSearchHit,
} from "@/lib/guidance/discover/types";
import { GUIDANCE_EXAM_GROUP_LABELS } from "@/lib/guidance/journey/reference-data/majors";
import { GUIDANCE_EXAM_GROUPS, type GuidanceExamGroup } from "@/lib/guidance/types";

export const DISCOVER_HOME = "/discover";

export function majorHref(slug: string): string {
  return `/discover/majors/${slug}`;
}

export function careerHref(slug: string): string {
  return `/discover/careers/${slug}`;
}

export function systemHref(slug: string): string {
  return `/discover/systems/${slug}`;
}

export function pathwayHref(slug: string): string {
  return `/discover/pathways/${slug}`;
}

export function programHref(slug: string): string {
  return `/discover/programs/${slug}`;
}

const CLUSTER_SYSTEMS: Record<string, readonly string[]> = {
  ENGINEERING: ["daily", "night", "pardis", "azad"],
  COMPUTER_SCIENCE: ["daily", "night", "azad", "pardis"],
  MEDICINE_HEALTH: ["daily", "pardis", "azad"],
  BASIC_SCIENCES: ["daily", "night", "azad"],
  HUMANITIES_LAW: ["daily", "azad", "payam-noor"],
  SOCIAL_SCIENCES_PSYCHOLOGY: ["daily", "azad", "nonprofit"],
  BUSINESS_MANAGEMENT: ["daily", "azad", "night"],
  ARTS_DESIGN: ["daily", "azad", "nonprofit"],
  EDUCATION_TEACHING: ["farhangian", "daily", "azad"],
  AGRICULTURE_ENVIRONMENT: ["daily", "azad", "payam-noor"],
};

const CLUSTER_PATHWAYS: Record<string, readonly string[]> = {
  ENGINEERING: ["bachelor", "master", "associate"],
  COMPUTER_SCIENCE: ["bachelor", "master"],
  MEDICINE_HEALTH: ["medicine", "bachelor"],
  BASIC_SCIENCES: ["bachelor", "master", "phd"],
  HUMANITIES_LAW: ["bachelor", "master"],
  SOCIAL_SCIENCES_PSYCHOLOGY: ["bachelor", "master"],
  BUSINESS_MANAGEMENT: ["bachelor", "master"],
  ARTS_DESIGN: ["bachelor", "associate"],
  EDUCATION_TEACHING: ["farhangian", "bachelor"],
  AGRICULTURE_ENVIRONMENT: ["bachelor", "associate"],
};

export function examGroupLabel(group: GuidanceExamGroup): string {
  return GUIDANCE_EXAM_GROUP_LABELS[group];
}

export function majorsForExamGroup(group: GuidanceExamGroup): readonly DiscoverMajor[] {
  return DISCOVER_MAJORS.filter((item) => item.examGroup === group);
}

export function relatedForMajor(slug: string): DiscoverRelated {
  const major = DISCOVER_MAJORS.find((item) => item.slug === slug);
  if (!major) {
    return { majors: [], systems: [], pathways: [], careers: [] };
  }
  const sameGroup = DISCOVER_MAJORS.filter(
    (item) => item.examGroup === major.examGroup && item.slug !== slug,
  );
  const sameCluster = DISCOVER_MAJORS.filter(
    (item) => item.cluster === major.cluster && item.slug !== slug,
  );
  const majors = sameGroup.slice(0, 3).map((item) => item.slug);
  const similar = sameCluster
    .map((item) => item.slug)
    .filter((item) => !majors.includes(item))
    .slice(0, 3);
  const careers = [...new Set([...majors, ...similar])].slice(0, 3);
  return {
    majors,
    systems: [...(CLUSTER_SYSTEMS[major.cluster] ?? ["daily", "azad"])],
    pathways: [...(CLUSTER_PATHWAYS[major.cluster] ?? ["bachelor"])],
    careers,
  };
}

export function relatedForSystem(slug: string): DiscoverRelated {
  const system = DISCOVER_SYSTEMS.find((item) => item.slug === slug);
  if (!system) {
    return { majors: [], systems: [], pathways: [], careers: [] };
  }
  const majors = DISCOVER_MAJORS.filter((item) => {
    const systems = CLUSTER_SYSTEMS[item.cluster] ?? [];
    return systems.includes(slug);
  })
    .slice(0, 4)
    .map((item) => item.slug);
  return {
    majors,
    systems: [...system.relatedSystems],
    pathways: [...system.relatedPathways],
    careers: majors.slice(0, 3),
  };
}

export function relatedForPathway(slug: string): DiscoverRelated {
  const pathway = DISCOVER_PATHWAYS.find((item) => item.slug === slug);
  if (!pathway) {
    return { majors: [], systems: [], pathways: [], careers: [] };
  }
  const majors = DISCOVER_MAJORS.filter((item) => {
    const paths = CLUSTER_PATHWAYS[item.cluster] ?? [];
    return paths.includes(slug);
  })
    .slice(0, 4)
    .map((item) => item.slug);
  return {
    majors,
    systems: [...pathway.relatedSystems],
    pathways: [...pathway.relatedPathways],
    careers: majors.slice(0, 3),
  };
}

function haystack(parts: readonly string[]): string {
  return parts.join(" ").replace(/\s+/g, " ");
}

export function searchDiscoverCatalog(query: string): DiscoverSearchHit[] {
  const q = query.trim();
  if (q.length < 1) return [];
  const needle = q.toLocaleLowerCase("fa");
  const hits: DiscoverSearchHit[] = [];

  for (const item of DISCOVER_SYSTEMS) {
    const text = haystack([item.title, item.kicker, item.lead, item.overview]);
    if (text.toLocaleLowerCase("fa").includes(needle) || item.title.includes(q)) {
      hits.push({
        kind: "system",
        slug: item.slug,
        title: item.title,
        href: systemHref(item.slug),
        excerpt: item.lead,
        groupLabel: "نظام دانشگاهی",
      });
    }
  }
  for (const item of DISCOVER_PATHWAYS) {
    const text = haystack([item.title, item.kicker, item.lead, item.overview]);
    if (text.toLocaleLowerCase("fa").includes(needle) || item.title.includes(q)) {
      hits.push({
        kind: "pathway",
        slug: item.slug,
        title: item.title,
        href: pathwayHref(item.slug),
        excerpt: item.lead,
        groupLabel: "مقطع تحصیلی",
      });
    }
  }
  for (const item of DISCOVER_MAJORS) {
    const text = haystack([
      item.title,
      item.kicker,
      item.lead,
      item.overview,
      ...item.career.paths,
    ]);
    if (text.toLocaleLowerCase("fa").includes(needle) || item.title.includes(q)) {
      hits.push({
        kind: "major",
        slug: item.slug,
        title: item.title,
        href: majorHref(item.slug),
        excerpt: item.lead,
        groupLabel: examGroupLabel(item.examGroup),
      });
      hits.push({
        kind: "career",
        slug: item.slug,
        title: `مسیر شغلی ${item.title}`,
        href: careerHref(item.slug),
        excerpt: item.career.outlook,
        groupLabel: "مسیر شغلی",
      });
    }
  }
  for (const item of DISCOVER_PROGRAMS) {
    const text = haystack([
      item.title,
      item.summary,
      item.description,
      ...item.searchTerms,
    ]);
    if (text.toLocaleLowerCase("fa").includes(needle) || item.title.includes(q)) {
      hits.push({
        kind: "program",
        slug: item.slug,
        title: item.title,
        href: programHref(item.slug),
        excerpt: item.summary,
        groupLabel: "مقطع و دوره",
      });
    }
  }
  return hits;
}

export function listDiscoverSitemapPaths(): readonly string[] {
  const paths = [
    DISCOVER_HOME,
    "/discover/systems",
    "/discover/majors",
    "/discover/programs",
    "/discover/pathways",
    "/discover/compare",
    "/discover/search",
  ];
  for (const item of DISCOVER_SYSTEMS) paths.push(systemHref(item.slug));
  for (const item of DISCOVER_PATHWAYS) paths.push(pathwayHref(item.slug));
  for (const item of DISCOVER_MAJORS) {
    paths.push(majorHref(item.slug));
    paths.push(careerHref(item.slug));
  }
  for (const item of DISCOVER_PROGRAMS) paths.push(programHref(item.slug));
  return paths;
}

export const DISCOVER_EXAM_GROUPS = GUIDANCE_EXAM_GROUPS;

export function kindLabel(kind: DiscoverKind): string {
  switch (kind) {
    case "system":
      return "نظام دانشگاهی";
    case "major":
      return "رشته";
    case "pathway":
      return "مقطع";
    case "career":
      return "مسیر شغلی";
    case "program":
      return "مقطع و دوره";
  }
}
