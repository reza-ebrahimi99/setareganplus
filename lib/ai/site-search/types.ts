export type SiteSearchCollection =
  | "content"
  | "courses"
  | "achievements"
  | "news"
  | "pages"
  | "forms";

export type SiteSearchDocument = {
  id: string;
  collection: SiteSearchCollection;
  title: string;
  summary: string;
  href: string;
  keywords: readonly string[];
};

export type SiteSearchHit = {
  document: SiteSearchDocument;
  score: number;
};

export type SiteSearchProvider = {
  id: string;
  label: string;
  search: (query: string, limit?: number) => Promise<SiteSearchHit[]> | SiteSearchHit[];
};
