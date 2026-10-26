import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSeo } from "@/lib/seo";

// One variable font file (Vazirmatn v33, OFL; capped at 800 like the old static set) instead of five weights:
// ~111 KB once, instead of five ~51 KB preloads.
const vazir = localFont({
  src: [{ path: "./fonts/Vazirmatn-Variable.woff2", weight: "100 800", style: "normal" }],
  variable: "--font-vazir",
  display: "swap",
});

const DEFAULT_GOOGLE_VERIFICATION = "IRhotNVDLDxqouc3oPqcWSOvRIJducjW3H4Hf8LeXhM";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  // Search Console token for setareganplus.ir — always emitted so verification never depends on the
  // admin panel; a token saved in admin SEO settings is added alongside it (both stay valid).
  const google = [...new Set([DEFAULT_GOOGLE_VERIFICATION, seo.googleVerification?.trim()].filter(Boolean) as string[])];
  const bing = seo.bingVerification?.trim();
  return {
    metadataBase: new URL(process.env.SITE_URL || "https://setareganplus.ir"),
    title: { default: "ستارگان پلاس | مؤسسه علمی ستارگان نسیم‌شهر", template: "%s | ستارگان پلاس" },
    description:
      "مؤسسه علمی ستارگان نسیم‌شهر: آموزشگاه تقویتی و کنکور ستارگان و نمایندگی رسمی قلم‌چی نسیم‌شهر.",
    applicationName: "ستارگان پلاس",
    openGraph: { locale: "fa_IR", type: "website", siteName: "ستارگان پلاس" },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
    verification: { google: google.length === 1 ? google[0] : google, ...(bing ? { other: { "msvalidate.01": bing } } : {}) },
  };
}

export const viewport: Viewport = { themeColor: "#0B1F3A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa-IR" dir="rtl" className={vazir.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
