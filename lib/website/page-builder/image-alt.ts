/**
 * Resolve image alt text for Page Builder sections.
 * Priority: altOverride → MediaAsset.altText → MediaAsset.title → ""
 */

import type { ResolvedSectionMedia } from "./types";

export function resolveSectionImageAlt(
  media: ResolvedSectionMedia | undefined,
  altOverride?: string,
): string {
  if (altOverride && altOverride.trim()) return altOverride.trim();
  if (media?.altText?.trim()) return media.altText.trim();
  if (media?.title?.trim()) return media.title.trim();
  return "";
}
