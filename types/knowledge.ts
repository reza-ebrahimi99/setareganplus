/**
 * StarOS AI Knowledge Layer — structured institutional knowledge blocks.
 * Source-agnostic: file today, CMS/DB/markdown/PDF later via loader adapters.
 */

export type KnowledgeCategory =
  | "institution"
  | "history"
  | "services"
  | "school"
  | "ghalamchi"
  | "summer-club"
  | "faq"
  | "contact"
  | "statistics"
  | "founder"
  | "staros";

export type KnowledgeBlock = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  keywords: readonly string[];
  content: string;
  /** Higher priority wins ties and soft-boosts ranking. */
  priority: number;
};

export type KnowledgeSourceId =
  | "static-files"
  | "database"
  | "cms"
  | "markdown"
  | "pdf";

export type KnowledgeSearchOptions = {
  query: string;
  /** Soft bias toward a category when page context is known. */
  preferredCategories?: readonly KnowledgeCategory[];
  limit?: number;
  maxCharacters?: number;
};

export type KnowledgeSearchHit = {
  block: KnowledgeBlock;
  score: number;
};

export type KnowledgeRetrievalResult = {
  hits: KnowledgeSearchHit[];
  formatted: string;
  truncated: boolean;
  sourceId: KnowledgeSourceId;
  /** Top-hit score for low-confidence fallbacks (site search). */
  confidence: number;
};
