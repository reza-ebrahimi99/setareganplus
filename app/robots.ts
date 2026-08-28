import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo/site-metadata";

/**
 * Public crawler policy.
 * Private surfaces stay disallowed; static assets remain crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/students",
          "/students/",
          "/admin/",
          "/portal/",
          "/staff/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
