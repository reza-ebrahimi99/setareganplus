import type { Metadata } from "next";
import localFont from "next/font/local";
import { AiAssistantHost } from "@/components/ai/AiAssistantHost";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_ORIGIN,
} from "@/lib/seo/site-metadata";
import "./globals.css";

const vazirmatn = localFont({
  src: [
    {
      path: "./fonts/Vazirmatn-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/Vazirmatn-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  fallback: ["Vazirmatn", "Tahoma", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "/",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <JsonLdScript />
        {children}
        <AiAssistantHost />
      </body>
    </html>
  );
}
