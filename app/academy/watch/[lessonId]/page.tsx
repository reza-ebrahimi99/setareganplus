import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyVideoPlayer } from "@/components/academy/AcademyVideoPlayer";
import { canUserAccessLesson } from "@/lib/academy/access";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ lessonId: string }> };

export default async function AcademyWatchPage({ params }: Props) {
  const { lessonId } = await params;
  const session = await requireAcademySession().catch(() => null);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/watch/${lessonId}`)}`);

  const organizationId = await getAcademyOrganizationId();
  const access = await canUserAccessLesson({
    organizationId,
    userId: session.userId,
    lessonId,
  });
  if (!access.allowed) {
    return (
      <AcademyShell>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-muted">دسترسی به این درس برای شما فعال نیست.</p>
          <Link href="/courses" className="academy-btn-primary mt-6 inline-flex">
            مشاهده دوره‌ها
          </Link>
        </div>
      </AcademyShell>
    );
  }

  const lesson = await prisma.academyLesson.findFirst({
    where: { id: lessonId, organizationId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                where: { status: "PUBLISHED" as const },
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true, slug: true },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson) notFound();

  const progress = await prisma.academyVideoProgress.findUnique({
    where: {
      organizationId_userId_lessonId: {
        organizationId,
        userId: session.userId,
        lessonId,
      },
    },
    select: { lastPositionSeconds: true },
  });

  return (
    <AcademyShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AcademyVideoPlayer
          lessonId={lesson.id}
          courseId={lesson.courseId}
          initialPosition={progress?.lastPositionSeconds ?? 0}
          watermarkLabel={session.displayName}
          watermarkMobile={session.mobile}
          userId={session.userId}
        />
        <h1 className="mt-6 text-xl font-bold">{lesson.title}</h1>
        <p className="text-sm text-muted">{lesson.course.title}</p>

        <aside className="mt-10 academy-card p-5">
          <h2 className="font-semibold">سرفصل</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lesson.course.sections.flatMap((s) =>
              s.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/watch/${l.id}`}
                    className={
                      l.id === lesson.id ? "font-bold text-secondary" : "text-muted"
                    }
                  >
                    {l.title}
                  </Link>
                </li>
              )),
            )}
          </ul>
        </aside>
      </div>
    </AcademyShell>
  );
}
