// Pure helpers (no DB) — safe to import from modules that client components also import.
const site = () => (process.env.SITE_URL || "https://setareganplus.ir").replace(/\/+$/, "");
export const abs = (p: string) => (/^https?:\/\//.test(p) ? p : site() + (p.startsWith("/") ? p : `/${p}`));

export type Crumb = { name: string; href?: string };
export function breadcrumbLd(trail: Crumb[]) {
  const items = [{ name: "خانه", href: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  };
}

