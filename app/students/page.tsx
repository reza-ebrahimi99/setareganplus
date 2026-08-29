import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

/**
 * Public Students section removed from site IA.
 * Legacy URLs permanently redirect to About.
 */
export const metadata: Metadata = createPageMetadata({
  title: "دانش‌آموزان | ستارگان پلاس",
  description: "صفحه عمومی دانش‌آموزان در سایت ستارگان پلاس فعال نیست.",
  path: "/students",
  robots: { index: false, follow: false },
});

export default function StudentsPage() {
  permanentRedirect("/about");
}
