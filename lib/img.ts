/**
 * Responsive images for uploaded media (/media/...).
 * /img/<w>/<path> serves a resized webp copy (made once with sharp, then cached on disk),
 * so phones download a ~30-60 KB image instead of the full upload.
 * Other sources (public/ files, external URLs) are returned unchanged.
 */
// 768 matters: a 412px-wide phone at DPR 1.75 needs ~660px for a full-width image
export const IMG_WIDTHS = [320, 480, 640, 768, 960, 1280] as const;

const RESIZABLE = /^\/media\/(?!\.)[^?#]+\.(jpe?g|png|webp)$/i;

export function isResizable(src: string | null | undefined): src is string {
  return !!src && RESIZABLE.test(src);
}

/** URL of the resized copy (falls back to the original for non-media sources). */
export function sized(src: string, w: number): string {
  return isResizable(src) ? `/img/${w}/${src.slice("/media/".length)}` : src;
}

/** Spread onto <img>: {src, srcSet, sizes}. `max` caps the largest candidate. */
export function responsive(src: string, sizes: string, max = 1280): { src: string; srcSet?: string; sizes?: string } {
  if (!isResizable(src)) return { src };
  const ws = IMG_WIDTHS.filter((w) => w <= max);
  return { src: sized(src, ws[ws.length - 1]), srcSet: ws.map((w) => `${sized(src, w)} ${w}w`).join(", "), sizes };
}
