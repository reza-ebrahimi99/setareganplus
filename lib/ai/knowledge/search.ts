import type {
  KnowledgeBlock,
  KnowledgeCategory,
  KnowledgeSearchHit,
  KnowledgeSearchOptions,
} from "@/types/knowledge";

const DEFAULT_LIMIT = 5;
const MIN_SCORE = 2.5;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length >= 2);
}

function includesPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.includes(needle);
}

function scoreBlock(
  block: KnowledgeBlock,
  queryTokens: string[],
  queryNormalized: string,
  preferredCategories: readonly KnowledgeCategory[],
): number {
  if (queryTokens.length === 0 && !queryNormalized) return 0;

  const title = normalize(block.title);
  const content = normalize(block.content);
  const keywords = block.keywords.map((item) => normalize(item));
  const category = normalize(block.category);

  let score = 0;

  for (const token of queryTokens) {
    if (includesPhrase(title, token)) score += 4;
    if (keywords.some((keyword) => includesPhrase(keyword, token) || includesPhrase(token, keyword))) {
      score += 5;
    }
    if (includesPhrase(content, token)) score += 1.5;
    if (includesPhrase(category, token)) score += 1;
  }

  // Phrase-level boosts for multi-word queries / keyword phrases.
  for (const keyword of keywords) {
    if (keyword.length >= 3 && includesPhrase(queryNormalized, keyword)) {
      score += 6;
    }
    if (keyword.length >= 3 && includesPhrase(title, keyword)) {
      score += 1;
    }
  }

  if (includesPhrase(title, queryNormalized) && queryNormalized.length >= 3) {
    score += 8;
  }

  if (preferredCategories.includes(block.category)) {
    score += 1.5;
  }

  // Soft priority influence (0–1.5 range for typical 70–100 priorities).
  score += Math.min(1.5, block.priority / 80);

  return score;
}

/**
 * Lightweight lexical retrieval (no embeddings / vector DB).
 * Scores title, keywords, content, category + optional category bias.
 */
export function searchKnowledgeBlocks(
  blocks: readonly KnowledgeBlock[],
  options: KnowledgeSearchOptions,
): KnowledgeSearchHit[] {
  const queryNormalized = normalize(options.query);
  const queryTokens = tokenize(options.query);
  const preferredCategories = options.preferredCategories ?? [];
  const limit = options.limit ?? DEFAULT_LIMIT;

  if (!queryNormalized) return [];

  const hits = blocks
    .map((block) => ({
      block,
      score: scoreBlock(block, queryTokens, queryNormalized, preferredCategories),
    }))
    .filter((hit) => hit.score >= MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.block.priority - a.block.priority;
    })
    .slice(0, limit);

  return hits;
}
