import type { KnowledgeSourceId } from "@/types/knowledge";

/**
 * Knowledge source registry — swap adapters later without changing API callers.
 */
export type KnowledgeSourceDescriptor = {
  id: KnowledgeSourceId;
  label: string;
  /** Active source for Phase 3 file-based retrieval. */
  active: boolean;
};

export const KNOWLEDGE_SOURCES: readonly KnowledgeSourceDescriptor[] = [
  {
    id: "static-files",
    label: "Static TypeScript knowledge packs (content/ai-knowledge)",
    active: true,
  },
  {
    id: "database",
    label: "Database-backed knowledge (future)",
    active: false,
  },
  {
    id: "cms",
    label: "CMS / admin-managed knowledge (future)",
    active: false,
  },
  {
    id: "markdown",
    label: "Markdown corpus (future)",
    active: false,
  },
  {
    id: "pdf",
    label: "PDF extraction corpus (future)",
    active: false,
  },
] as const;

export function getActiveKnowledgeSourceId(): KnowledgeSourceId {
  const active = KNOWLEDGE_SOURCES.find((source) => source.active);
  return active?.id ?? "static-files";
}
