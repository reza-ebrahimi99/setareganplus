import Link from "next/link";
import { redirect } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "کتابخانه من", robots: { index: false } };

export default async function AcademyLibraryPage() {
  const session = await requireAcademySession().catch(() => null);
  if (!session) redirect("/login?next=/account/library");

  const organizationId = await getAcademyOrganizationId();
  const now = new Date();

  const entitlements = await prisma.academyContentEntitlement.findMany({
    where: {
      organizationId,
      userId: session.userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      course: { select: { title: true, slug: true, instructorName: true } },
      lesson: { select: { title: true, slug: true, courseId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const progress = await prisma.academyVideoProgress.findMany({
    where: { organizationId, userId: session.userId },
    orderBy: { lastViewedAt: "desc" },
    take: 5,
    include: {
      course: { select: { slug: true, title: true } },
      lesson: { select: { title: true, id: true } },
    },
  });

  return (
    <AcademyShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          سلام، {session.displayName}
        </h1>

        {progress.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-semibold text-primary">ادامه تماشا</h2>
            <ul className="mt-4 space-y-3">
              {progress.map((p) => (
                <li key={p.id} className="academy-card p-4">
                  <Link href={`/watch/${p.lessonId}`}>
                    <p className="text-xs text-muted">{p.course.title}</p>
                    <p className="font-medium">{p.lesson.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="font-semibold">کتابخانه</h2>
          {entitlements.length === 0 ? (
            <div className="academy-card mt-4 p-10 text-center text-muted">
              <p>هنوز دوره‌ای به کتابخانه شما اضافه نشده است.</p>
              <Link href="/courses" className="academy-btn-primary mt-6 inline-flex">
                مشاهده دوره‌ها
              </Link>
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {entitlements.map((e) => (
                <li key={e.id} className="academy-card p-5">
                  {e.course && !e.lessonId ? (
                    <Link href={`/account/courses/${e.course.slug}`}>
                      <p className="text-xs text-muted">دوره</p>
                      <p className="font-semibold">{e.course.title}</p>
                      {e.expiresAt ? (
                        <p className="mt-2 text-xs text-muted">
                          انقضا: {e.expiresAt.toLocaleDateString("fa-IR")}
                        </p>
                      ) : null}
                    </Link>
                  ) : e.lesson ? (
                    <Link href={`/watch/${e.lessonId}`}>
                      <p className="text-xs text-muted">ویدئو</p>
                      <p className="font-semibold">{e.lesson.title}</p>
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AcademyShell>
  );
}
