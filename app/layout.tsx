import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { siteConfig } from "@/content/site";
import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: [
      { url: "/images/brand/setaregan-icon.png", type: "image/png" },
      {
        url: "/images/brand/setaregan-icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/images/brand/setaregan-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/images/brand/setaregan-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: ["/images/brand/setaregan-icon.png"],
    apple: [
      {
        url: "/images/brand/setaregan-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
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
        {children}
      </body>
    </html>
  );
}
