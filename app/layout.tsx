import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const vazir = localFont({
  src: [
    { path: "./fonts/Vazirmatn-Regular.woff2", weight: "400" },
    { path: "./fonts/Vazirmatn-Medium.woff2", weight: "500" },
    { path: "./fonts/Vazirmatn-SemiBold.woff2", weight: "600" },
    { path: "./fonts/Vazirmatn-Bold.woff2", weight: "700" },
    { path: "./fonts/Vazirmatn-ExtraBold.woff2", weight: "800" },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://setareganplus.ir"),
  title: { default: "ستارگان پلاس | مؤسسه علمی ستارگان نسیم‌شهر", template: "%s | ستارگان پلاس" },
  description:
    "مؤسسه علمی ستارگان نسیم‌شهر: آموزشگاه تقویتی و کنکور ستارگان و نمایندگی رسمی قلم‌چی نسیم‌شهر.",
  openGraph: { locale: "fa_IR", type: "website", siteName: "ستارگان پلاس" },
};

export const viewport: Viewport = { themeColor: "#0B1F3A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
