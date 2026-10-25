import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ستارگان پلاس — مؤسسه علمی ستارگان نسیم‌شهر",
    short_name: "ستارگان پلاس",
    description: "آموزشگاه تقویتی و کنکور ستارگان، نمایندگی قلم‌چی نسیم‌شهر و فروشگاه جزوه",
    lang: "fa-IR",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B1F3A",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
