import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

/**
 * Public student profile pages are disabled for privacy.
 * Individual identities (name, photo, biography, grade-linked profiles) are not exposed.
 */

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return createPageMetadata({
    title: "یافت نشد | ستارگان پلاس",
    description: "پروفایل عمومی دانش‌آموز در سایت ستارگان پلاس در دسترس نیست.",
    path: `/students/${slug}`,
    robots: { index: false, follow: false },
  });
}

export default async function PublicStudentProfilePage({}: PageProps) {
  notFound();
}
