import { isAiFeatureEnabled } from "@/lib/ai/config";
import { staticSiteSearchProvider } from "@/lib/ai/site-search/static-provider";
import type {
  SiteSearchHit,
  SiteSearchProvider,
} from "@/lib/ai/site-search/types";

let activeProvider: SiteSearchProvider = staticSiteSearchProvider;

/** Swap provider later (DB / vector) without changing callers. */
export function setSiteSearchProvider(provider: SiteSearchProvider): void {
  activeProvider = provider;
}

export function getSiteSearchProvider(): SiteSearchProvider {
  return activeProvider;
}

export async function searchInternalSite(
  query: string,
  limit = 5,
): Promise<SiteSearchHit[]> {
  if (!isAiFeatureEnabled("siteSearch")) return [];
  const result = activeProvider.search(query, limit);
  return Promise.resolve(result);
}

export function formatSiteSearchForPrompt(hits: readonly SiteSearchHit[]): string {
  if (hits.length === 0) return "";
  const lines = hits.map(
    (hit, index) =>
      `${index + 1}. ${hit.document.title} (${hit.document.collection}) → ${hit.document.href}\n${hit.document.summary}`,
  );
  return [
    "Internal Site Search Results",
    "Use only as navigation/content hints. Do not invent unpublished details.",
    ...lines,
  ].join("\n");
}

export type { SiteSearchHit, SiteSearchProvider } from "@/lib/ai/site-search/types";
