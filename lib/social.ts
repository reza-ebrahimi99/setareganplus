/** Official Aparat channel. Shown in the social row and in schema.org sameAs. */
export const APARAT_URL = "https://www.aparat.com/setareganplus";
export const APARAT_SOCIAL = { label: "آپارات", url: APARAT_URL };

/**
 * Institute Instagram, in addition to the Ghalamchi account already in the social row.
 * sameAs only: a second «اینستاگرام» button would look like a duplicate.
 */
export const INSTITUTE_INSTAGRAM_URL = "https://www.instagram.com/setaregan.institutee";

function canon(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

export function isAparatProfile(url: string): boolean {
  return canon(url) === canon(APARAT_URL);
}

export function withAparatSocial<T extends { label: string; url: string }>(social: T[]): T[] {
  const list = social.filter((s): s is T => !!s && typeof s.url === "string" && /^https?:\/\//.test(s.url));
  if (list.some((s) => isAparatProfile(s.url))) return list;
  return [...list, { label: APARAT_SOCIAL.label, url: APARAT_SOCIAL.url } as T];
}

/** Social profile URLs for schema.org sameAs, plus the institute Instagram when it is not already listed. */
export function sameAsUrls(social: { url: string }[]): string[] {
  const urls = social.map((s) => s.url).filter((u) => /^https?:\/\//.test(u));
  if (!urls.some((u) => canon(u) === canon(INSTITUTE_INSTAGRAM_URL))) urls.push(INSTITUTE_INSTAGRAM_URL);
  return [...new Set(urls)];
}
