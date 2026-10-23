import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.SITE_URL || "https://setareganplus.ir";
  return ["", "/education", "/ghalamchi", "/about", "/team", "/achievements", "/gallery", "/contact", "/faq", "/register"].map((p) => ({ url: site + p }));
}
