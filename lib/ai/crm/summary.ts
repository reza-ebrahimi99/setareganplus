/**
 * Short CRM timeline summary (< 200 chars).
 */
export function buildCrmConversationSummary(input: {
  intent: string;
  grade?: string | null;
  service?: string | null;
  recentUserTexts?: readonly string[];
}): string {
  const last = (input.recentUserTexts ?? [])
    .slice(-2)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" | ");

  const parts = [
    `قصد:${input.intent}`,
    input.grade ? `پایه:${input.grade}` : null,
    input.service ? `خدمت:${input.service}` : null,
    last ? `گفتگو:${last}` : null,
  ].filter(Boolean);

  let summary = parts.join(" · ");
  if (summary.length > 197) {
    summary = `${summary.slice(0, 197)}…`;
  }
  return summary || "گفتگوی کوتاه با دستیار ستاره";
}
