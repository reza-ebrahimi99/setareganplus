/**
 * Unified WebsitePage publish rules (Phase 2.1).
 */

import type { PageStatus } from "./constants";

/**
 * Resolve publishedAt when changing page status.
 * - Leaving PUBLISHED → null
 * - First transition to PUBLISHED → now
 * - Republish while already PUBLISHED → preserve previous timestamp
 */
export function resolvePagePublishedAt(params: {
  nextStatus: PageStatus;
  previousStatus: PageStatus;
  previousPublishedAt: Date | null;
  now?: Date;
}): Date | null {
  if (params.nextStatus !== "PUBLISHED") {
    return null;
  }

  if (
    params.previousStatus === "PUBLISHED" &&
    params.previousPublishedAt != null
  ) {
    return params.previousPublishedAt;
  }

  return params.now ?? new Date();
}
