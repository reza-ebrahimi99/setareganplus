/**
 * Pure placement resolution decision (no DB).
 * Used by loaders and smoke tests.
 */

import type { PlacementSource } from "@/lib/site/placement-registry";

export type PlacementRowSnapshot = {
  isEnabled: boolean;
  contentType: "FORM" | "BOOKING" | "NONE";
  hasValidContent: boolean;
};

export type PlacementDecision =
  | { outcome: "use_database"; source: "database" }
  | { outcome: "disabled"; source: "disabled" }
  | { outcome: "invalid_database"; source: "database" }
  | { outcome: "use_env"; source: "env" }
  | { outcome: "none"; source: "none" };

/**
 * Priority:
 * 1. DB enabled + valid content → database
 * 2. DB enabled + invalid/missing content → invalid (no env)
 * 3. DB disabled → suppress env
 * 4. No DB row + env slug → env
 * 5. else → none
 */
export function decidePlacementResolution(params: {
  row: PlacementRowSnapshot | null;
  envSlug: string | null;
}): PlacementDecision {
  if (params.row) {
    if (!params.row.isEnabled) {
      return { outcome: "disabled", source: "disabled" };
    }
    if (
      params.row.contentType === "NONE" ||
      !params.row.hasValidContent
    ) {
      return { outcome: "invalid_database", source: "database" };
    }
    return { outcome: "use_database", source: "database" };
  }

  if (params.envSlug) {
    return { outcome: "use_env", source: "env" };
  }

  return { outcome: "none", source: "none" };
}

export function assertNeverSource(source: PlacementSource): PlacementSource {
  return source;
}
