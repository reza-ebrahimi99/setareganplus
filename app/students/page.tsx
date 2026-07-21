import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

/**
 * Public Students section removed from site IA.
 * Legacy URLs permanently redirect to About.
 */
export const metadata: Metadata = {
  title: "دانش‌آموزان",
  robots: { index: false, follow: false },
};

export default function StudentsPage() {
  permanentRedirect("/about");
}
