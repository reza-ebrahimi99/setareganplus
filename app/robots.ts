import type { MetadataRoute } from "next";

/**
 * Disallow legacy public student routes from crawlers.
 * Student identities live only in authenticated admin/portal surfaces.
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
        ],
      },
    ],
  };
}
