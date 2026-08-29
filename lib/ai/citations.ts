import type { SiteSearchHit } from "@/lib/ai/site-search/types";
import type { AiCitation } from "@/types/ai-citations";
import type { KnowledgeSearchHit } from "@/types/knowledge";

export type { AiCitation } from "@/types/ai-citations";

const CATEGORY_HREF: Record<string, string> = {
  institution: "/about",
  history: "/about",
  founder: "/about",
  school: "/about",
  services: "/courses",
  ghalamchi: "/ghalamchi/register",
  "summer-club": "/pre-registration",
  faq: "/faq",
  contact: "/contact",
  statistics: "/achievements",
  staros: "/about",
};

/**
 * Build optional citation list from knowledge + site-search hits.
 */
export function buildCitations(input: {
  knowledgeHits?: readonly KnowledgeSearchHit[];
  siteHits?: readonly SiteSearchHit[];
}): AiCitation[] {
  const citations: AiCitation[] = [];
  const seen = new Set<string>();

  for (const hit of input.knowledgeHits ?? []) {
    const id = `know:${hit.block.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    citations.push({
      id,
      label: hit.block.title,
      href: CATEGORY_HREF[hit.block.category] ?? "/about",
      sourceType:
        hit.block.category === "faq"
          ? "faq"
          : hit.block.category === "statistics"
            ? "statistics"
            : "knowledge",
    });
  }

  for (const hit of input.siteHits ?? []) {
    const id = `site:${hit.document.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    citations.push({
      id,
      label: hit.document.title,
      href: hit.document.href,
      sourceType: "site-search",
    });
  }

  return citations.slice(0, 6);
}
