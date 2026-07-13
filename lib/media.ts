/**
 * StarOS media library — presentation contract.
 * Content and components accept resolved URLs from admin uploads;
 * no dependency on files under public/images.
 */
export type MediaAsset = {
  /** Resolved CDN or API URL; null until assigned in StarOS media library */
  url?: string | null;
  alt: string;
};

export function resolveMediaUrl(
  media?: MediaAsset | null,
): string | undefined {
  const url = media?.url;
  return url ? url : undefined;
}

export function hasMediaUrl(
  media?: MediaAsset | null,
): media is MediaAsset & { url: string } {
  return Boolean(media?.url);
}
