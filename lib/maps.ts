/**
 * Branch map links.
 *
 * The boys short link is the owner's Google Maps place («آموزشگاه علمی ستارگان نسیم شهر»)
 * and must stay. The old girls short link (maps.app.goo.gl/b8b8v3bMTGksEUhMA) opens a
 * neighbouring bridal salon, «عروس سرای پاریس», so it is rewritten to a Google Maps
 * search for the girls-branch address as written on the site. That search does not
 * pin a coordinate; do not invent geo from it.
 *
 * There is no on-site Neshan/Balad link pattern (those apps are only mentioned in the
 * owner SEO checklist), so no extra map providers are added here.
 */

/** Exact girls-branch address from the site copy / contact seed. */
export const GIRLS_BRANCH_ADDRESS = "نسیم‌شهر، خیابان امام خمینی، نرسیده به خیابان سوم، کوچه پاییزان، پلاک ۱۸۸";

const LEGACY_GIRLS_MAP_ID = "b8b8v3bMTGksEUhMA";

export function googleMapsSearchUrl(address: string): string {
  const query = address.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export const GIRLS_MAP_URL = googleMapsSearchUrl(GIRLS_BRANCH_ADDRESS);

export function isLegacyGirlsMap(url: string): boolean {
  try {
    const u = new URL(url);
    const id = u.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
    return (u.hostname === "maps.app.goo.gl" || u.hostname === "goo.gl") && id === LEGACY_GIRLS_MAP_ID;
  } catch {
    return url.includes(LEGACY_GIRLS_MAP_ID);
  }
}

/** Replace only the known-bad girls link. Every other map URL, including the boys place, is unchanged. */
export function withPublicMap<T extends { address?: string; mapUrl?: string }>(branch: T): T {
  if (!branch.mapUrl || !isLegacyGirlsMap(branch.mapUrl)) return branch;
  const address = branch.address?.trim() || GIRLS_BRANCH_ADDRESS;
  return { ...branch, mapUrl: googleMapsSearchUrl(address) };
}
