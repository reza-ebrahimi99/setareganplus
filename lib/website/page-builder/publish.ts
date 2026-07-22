/**
 * Unified WebsitePage publish rules (Phase 2.1 + 2.2).
 */

import type { PageStatus } from "./constants";

/**
 * Resolve publishedAt when changing page status.
 * - publishedAt is historical publication time and is never cleared by status changes.
 * - First transition to PUBLISHED sets publishedAt to now when none exists.
 * - Re-publishing preserves the existing publishedAt.
 */
export function resolvePagePublishedAt(params: {
  nextStatus: PageStatus;
  previousPublishedAt: Date | null;
  now?: Date;
}): Date | null {
  if (params.nextStatus !== "PUBLISHED") {
    return params.previousPublishedAt;
  }

  if (params.previousPublishedAt != null) {
    return params.previousPublishedAt;
  }

  return params.now ?? new Date();
}

/** Clear archivedAt when explicitly publishing a page. */
export function resolvePageArchivedAtOnPublish(
  nextStatus: PageStatus,
): null | undefined {
  return nextStatus === "PUBLISHED" ? null : undefined;
}
