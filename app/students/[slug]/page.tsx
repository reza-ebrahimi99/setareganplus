import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Public student profile pages are disabled for privacy.
 * Individual identities (name, photo, biography, grade-linked profiles) are not exposed.
 */
export const metadata: Metadata = {
  title: "یافت نشد",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ slug: string }> };

export default async function PublicStudentProfilePage(_props: PageProps) {
  notFound();
}
