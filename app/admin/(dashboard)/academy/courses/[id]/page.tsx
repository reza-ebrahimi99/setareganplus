import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { publishAcademyCourseAction } from "@/app/admin/(dashboard)/academy/actions";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function AdminAcademyCourseDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAdminSession();
  assertPermission(session, "academy.manage");

  const course = await prisma.academyCourse.findFirst({
    where: { id, organizationId: session.organization.id, deletedAt: null },
    include: {
      sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } },
      lessons: { where: { sectionId: null }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!course) notFound();

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="text-sm text-muted">وضعیت: {course.status}</p>
      {course.status !== "PUBLISHED" ? (
        <form action={publishAcademyCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-white text-sm">
            انتشار دوره
          </button>
        </form>
      ) : null}
      <div>
        <h2 className="font-semibold">فصل‌ها و جلسات</h2>
        <p className="mt-2 text-sm text-muted">
          {course.sections.length} فصل —{" "}
          {course.sections.reduce((n, s) => n + s.lessons.length, 0) + course.lessons.length}{" "}
          جلسه
        </p>
      </div>
    </div>
  );
}
