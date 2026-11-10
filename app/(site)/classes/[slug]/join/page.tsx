import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { classJoinPath, classJoinReturn } from "@/lib/classes/catalog";
import { grantFreeEnrollment } from "../../actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Finish a free enrollment, then open the course, the lesson, or the file the student asked for. */
export default async function JoinCourse({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ then?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const course = await prisma.classCourse.findUnique({ where: { slug }, select: { id: true, published: true } });
  if (!course?.published) redirect("/classes");
  const back = classJoinReturn(slug, sp.then) ?? `/classes/${slug}?ok=1`;
  const result = await grantFreeEnrollment(course.id);
  if (!result.ok && result.reason === "login") redirect(`/classes/login?next=${encodeURIComponent(classJoinPath(slug, sp.then))}`);
  if (!result.ok && result.reason === "pay") redirect(`/classes/${slug}?e=pay`);
  if (!result.ok) redirect("/classes");
  redirect(back);
}
