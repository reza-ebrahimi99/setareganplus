import type { Metadata } from "next";
import { AtrinLandingPage } from "@/components/atrin/landing/AtrinLandingPage";
import { ATRIN_LANDING } from "@/content/atrin";

export const metadata: Metadata = {
  title: ATRIN_LANDING.metaTitle,
  description: ATRIN_LANDING.metaDescription,
  alternates: { canonical: "/atrin" },
  openGraph: {
    title: ATRIN_LANDING.metaTitle,
    description: ATRIN_LANDING.metaDescription,
    url: "/atrin",
  },
};

export default function AtrinPage() {
  return <AtrinLandingPage />;
}
