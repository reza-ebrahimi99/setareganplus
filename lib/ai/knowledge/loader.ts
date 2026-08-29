import { staticKnowledgeBlocks } from "@/content/ai-knowledge";
import { getActiveKnowledgeSourceId } from "@/lib/ai/knowledge/sources";
import type { KnowledgeBlock, KnowledgeSourceId } from "@/types/knowledge";

/**
 * Source-agnostic knowledge loader.
 * Today: static files. Later: database / CMS / markdown / PDF adapters.
 */
export async function loadKnowledgeBlocks(
  sourceId: KnowledgeSourceId = getActiveKnowledgeSourceId(),
): Promise<KnowledgeBlock[]> {
  switch (sourceId) {
    case "static-files":
      return staticKnowledgeBlocks;
    case "database":
    case "cms":
    case "markdown":
    case "pdf":
      // Future adapters plug in here without changing search/API.
      return [];
    default:
      return staticKnowledgeBlocks;
  }
}

/** Sync helper for client outbound path (static packs are sync today). */
export function loadKnowledgeBlocksSync(
  sourceId: KnowledgeSourceId = getActiveKnowledgeSourceId(),
): KnowledgeBlock[] {
  if (sourceId === "static-files") {
    return staticKnowledgeBlocks;
  }
  return [];
}
