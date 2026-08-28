export type AiCitation = {
  id: string;
  label: string;
  href?: string;
  sourceType: "knowledge" | "page" | "faq" | "statistics" | "site-search";
};
