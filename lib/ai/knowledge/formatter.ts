import type {
  KnowledgeRetrievalResult,
  KnowledgeSearchHit,
  KnowledgeSourceId,
} from "@/types/knowledge";

export const KNOWLEDGE_MAX_BLOCKS = 5;
export const KNOWLEDGE_MAX_CHARACTERS = 2500;

/**
 * Format retrieved blocks for system-prompt injection.
 * Enforces max blocks and max characters. Empty when nothing matches.
 */
export function formatKnowledgeContext(
  hits: readonly KnowledgeSearchHit[],
  sourceId: KnowledgeSourceId,
  maxBlocks = KNOWLEDGE_MAX_BLOCKS,
  maxCharacters = KNOWLEDGE_MAX_CHARACTERS,
): KnowledgeRetrievalResult {
  if (hits.length === 0) {
    return {
      hits: [],
      formatted: "",
      truncated: false,
      sourceId,
      confidence: 0,
    };
  }

  const selected: KnowledgeSearchHit[] = [];
  const parts: string[] = [
    "Relevant Institution Knowledge",
    "Use ONLY the following verified blocks. If insufficient, say you do not have exact information.",
    "",
  ];

  let used = parts.join("\n").length;
  let truncated = false;

  for (const hit of hits.slice(0, maxBlocks)) {
    const chunk = [
      `[${hit.block.id}] ${hit.block.title} (${hit.block.category})`,
      hit.block.content,
      "",
    ].join("\n");

    if (used + chunk.length > maxCharacters) {
      truncated = true;
      break;
    }

    selected.push(hit);
    parts.push(chunk.trimEnd());
    parts.push("");
    used += chunk.length;
  }

  const formatted = parts.join("\n").trim();

  return {
    hits: selected,
    formatted: selected.length > 0 ? formatted : "",
    truncated: truncated || hits.length > selected.length,
    sourceId,
    confidence: selected[0]?.score ?? hits[0]?.score ?? 0,
  };
}
