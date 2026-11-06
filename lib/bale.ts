/**
 * Public Bale destinations for the site.
 *
 * Channel «قلمچی نسیم شهر» is the public page for posts and social links.
 * Direct admin chat is a separate ble.ir phone page (canonical on ble.ir).
 * That page does not forward a ?text= prefill, so the chat link stays bare.
 * Sharing a page uses Bale's own share endpoint, which accepts url and text.
 */
export const BALE_CHANNEL_URL = "https://ble.ir/ghalamchi1404";
export const BALE_ADMIN_CHAT_URL = "https://ble.ir/09384567054";
/** Official primary button color (--color-primary-p-50 on ble.ir). */
export const BALE_BRAND = "#00b894";

/** Seeded invite that still points at the same channel. Social links use the public page. */
const LEGACY_CHANNEL_JOIN = /^\/join\/angrkipzkv\/?$/i;

export function isLegacyBaleJoin(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname === "ble.ir" && LEGACY_CHANNEL_JOIN.test(u.pathname) && u.search === "" && u.hash === "";
  } catch {
    return false;
  }
}

/** Leave a customized social URL alone. Only the old channel invite becomes the public page. */
export function publicBaleSocialUrl(url: string): string {
  return isLegacyBaleJoin(url) ? BALE_CHANNEL_URL : url;
}

export function baleShareUrl(url: string, text: string): string {
  return `https://ble.ir/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
