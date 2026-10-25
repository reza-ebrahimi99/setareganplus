import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shop/config";

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // private / transactional pages: admin, APIs, order tracking, booklet receipts, short links, payment callback
        disallow: ["/admin", "/api", "/order", "/booklet", "/o/", "/shop/pay", "/payments"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
