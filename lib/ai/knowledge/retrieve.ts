import { formatKnowledgeContext } from "@/lib/ai/knowledge/formatter";
import { loadKnowledgeBlocksSync } from "@/lib/ai/knowledge/loader";
import { searchKnowledgeBlocks } from "@/lib/ai/knowledge/search";
import { getActiveKnowledgeSourceId } from "@/lib/ai/knowledge/sources";
import { AI_TUNABLES } from "@/lib/ai/config";
import type {
  KnowledgeCategory,
  KnowledgeRetrievalResult,
} from "@/types/knowledge";

export type RetrieveKnowledgeInput = {
  query: string;
  preferredCategories?: readonly KnowledgeCategory[];
  maxBlocks?: number;
  maxCharacters?: number;
};

/**
 * End-to-end retrieval for outbound AI requests.
 * Search → top hits → bounded formatted context.
 */
export function retrieveKnowledgeContext(
  input: RetrieveKnowledgeInput,
): KnowledgeRetrievalResult {
  const sourceId = getActiveKnowledgeSourceId();
  const blocks = loadKnowledgeBlocksSync(sourceId);
  const hits = searchKnowledgeBlocks(blocks, {
    query: input.query,
    preferredCategories: input.preferredCategories,
  });

  return formatKnowledgeContext(
    hits,
    sourceId,
    input.maxBlocks ?? AI_TUNABLES.knowledgeMaxBlocks,
    input.maxCharacters ?? AI_TUNABLES.knowledgeMaxCharacters,
  );
}

export function extractLastUserQuery(
  messages: ReadonlyArray<{ role: string; content: string }>,
): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user" && message.content.trim()) {
      return message.content.trim();
    }
  }
  return "";
}

/** Soft page→category bias for retrieval ranking. */
export function preferredCategoriesForPage(
  page: string,
): readonly KnowledgeCategory[] {
  switch (page) {
    case "about":
      return ["institution", "history", "founder", "statistics"];
    case "achievements":
      return ["statistics", "services", "school"];
    case "pre-registration":
      return ["faq", "services", "school", "contact"];
    case "gallery":
      return ["institution", "school", "contact"];
    case "home":
      return ["institution", "services", "school", "ghalamchi"];
    default:
      return [];
  }
}
