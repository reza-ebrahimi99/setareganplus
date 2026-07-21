/**
 * Media placement keys for website image slots (distinct from form SitePlacement).
 */

export const MEDIA_PLACEMENT_KEYS = ["HOME_GALLERY"] as const;

export type MediaPlacementKey = (typeof MEDIA_PLACEMENT_KEYS)[number];

export const HOME_GALLERY_PLACEMENT_KEY =
  "HOME_GALLERY" satisfies MediaPlacementKey;

export function isMediaPlacementKey(value: string): value is MediaPlacementKey {
  return (MEDIA_PLACEMENT_KEYS as readonly string[]).includes(value);
}
