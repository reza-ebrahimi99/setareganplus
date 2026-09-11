/**
 * Map student feedback from a published INITIAL snapshot onto a revision list.
 * Feedback stays on the source item; revision rows keep sourceItemId.
 */

export function nextRevisionSourceItemId(item: {
  id: string;
  sourceItemId: string | null;
}): string {
  return item.sourceItemId ?? item.id;
}

export function mapSourceFeedback<
  T extends { sourceItemId: string | null; feedback: F | null },
  F,
>(targetItems: T[], sourceItems: Array<{ id: string; feedback: F | null }>): T[] {
  const bySource = new Map(sourceItems.map((item) => [item.id, item.feedback]));
  return targetItems.map((item) => {
    if (item.feedback) return item;
    if (!item.sourceItemId) return item;
    const mapped = bySource.get(item.sourceItemId);
    if (!mapped) return item;
    return { ...item, feedback: mapped };
  });
}
