import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo/site-metadata";

/**
 * Static public sitemap for Phase 1 technical SEO.
 * Dynamic CMS URLs (team, achievements, assessments, /p/[slug], forms, booking)
 * are deferred until a safe runtime/DB strategy is in place.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const entries: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.9 },
    { path: "/pre-registration", changeFrequency: "monthly", priority: 0.9 },
    { path: "/classes", changeFrequency: "monthly", priority: 0.85 },
    { path: "/courses", changeFrequency: "monthly", priority: 0.8 },
    { path: "/assessments", changeFrequency: "weekly", priority: 0.85 },
    { path: "/exams", changeFrequency: "monthly", priority: 0.8 },
    { path: "/consultation", changeFrequency: "monthly", priority: 0.8 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.85 },
    { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
    { path: "/team", changeFrequency: "weekly", priority: 0.7 },
    { path: "/achievements", changeFrequency: "weekly", priority: 0.7 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.65 },
  ];

  return entries.map((entry) => ({
    url: `${SITE_ORIGIN}${entry.path === "/" ? "" : entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
