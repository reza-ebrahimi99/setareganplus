/**
 * Allowed public hrefs for Star action cards.
 * Never invent URLs — only values listed here (or derived from content/home contact).
 */

export const ALLOWED_INTERNAL_ROUTES = [
  "/",
  "/about",
  "/achievements",
  "/gallery",
  "/contact",
  "/pre-registration",
  "/consultation",
  "/courses",
  "/classes",
  "/exams",
  "/ghalamchi/register",
  "/assessments",
  "/faq",
  "/team",
  "/students",
] as const;

export type AllowedInternalRoute = (typeof ALLOWED_INTERNAL_ROUTES)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_INTERNAL_ROUTES);

export function isAllowedInternalRoute(href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (ALLOWED_SET.has(href)) return true;
  // Allow known prefixes that exist as app routes
  return (
    href.startsWith("/gallery/") ||
    href.startsWith("/achievements/") ||
    href.startsWith("/students/") ||
    href.startsWith("/team/") ||
    href.startsWith("/ghalamchi/")
  );
}

export function isSafeActionHref(href: string): boolean {
  if (isAllowedInternalRoute(href)) return true;
  if (href.startsWith("tel:")) return true;
  if (href.startsWith("mailto:")) return true;
  if (href.startsWith("https://maps.app.goo.gl/")) return true;
  if (href.startsWith("https://wa.me/")) return true;
  if (href.startsWith("https://t.me/")) return true;
  if (href.startsWith("https://ble.ir/")) return true;
  if (href.startsWith("https://instagram.com/")) return true;
  return false;
}
