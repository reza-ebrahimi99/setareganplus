import Link from "next/link";
import { notFound } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { getPublishedCourseBySlug } from "@/lib/academy/catalog";
import { userOwnsCourse } from "@/lib/academy/access";
import { resolveAcademySession } from "@/lib/academy/auth/session";
import { formatTomanFromRials } from "@/lib/academy/money";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const organizationId = await getAcademyOrganizationId();
  const course = await getPublishedCourseBySlug(organizationId, slug);
  if (!course) return { title: "دوره" };
  return {
    title: course.seoTitle ?? course.title,
    description: course.seoDescription ?? course.shortDescription ?? undefined,
  };
}

export default async function AcademyCourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const organizationId = await getAcademyOrganizationId();
  const course = await getPublishedCourseBySlug(organizationId, slug);
  if (!course) notFound();

  const session = await resolveAcademySession();
  const owns =
    session &&
    (await userOwnsCourse({
      organizationId,
      userId: session.userId,
      courseId: course.id,
    }));

  const lessonCount =
    course.lessons.length +
    course.sections.reduce((n, s) => n + s.lessons.length, 0);

  const checkoutHref = `/checkout?course=${encodeURIComponent(course.id)}`;

  return (
    <AcademyShell activePath="/courses">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-sm text-muted">{course.instructorName ?? "مدرس"}</p>
            <h1 className="mt-2 text-3xl font-bold text-primary">{course.title}</h1>
            {course.subtitle ? (
              <p className="mt-2 text-lg text-muted">{course.subtitle}</p>
            ) : null}
            <p className="mt-6 leading-relaxed text-muted whitespace-pre-wrap">
              {course.description ?? course.shortDescription ?? ""}
            </p>
            <p className="mt-4 text-sm text-muted">{lessonCount} جلسه</p>

            <h2 className="mt-10 text-lg font-bold">سرفصل دوره</h2>
            <div className="mt-4 space-y-6">
              {course.sections.map((section) => (
                <div key={section.id}>
                  <h3 className="font-semibold text-primary">{section.title}</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {section.lessons.map((l) => (
                      <li key={l.id}>
                        {l.title}
                        {l.isPreview ? " (پیش‌نمایش)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {course.lessons.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted">
                  {course.lessons.map((l) => (
                    <li key={l.id}>{l.title}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <aside className="academy-card h-fit p-6 lg:sticky lg:top-24">
            <p className="text-2xl font-bold text-secondary" dir="ltr">
              {formatTomanFromRials(course.priceRials)}
            </p>
            {course.lifetimeAccess ? (
              <p className="mt-2 text-xs text-muted">دسترسی مادام‌العمر</p>
            ) : course.accessDurationDays ? (
              <p className="mt-2 text-xs text-muted">
                {course.accessDurationDays} روز دسترسی
              </p>
            ) : null}
            {owns ? (
              <Link
                href={`/account/courses/${course.slug}`}
                className="academy-btn-primary mt-6 w-full text-center"
              >
                ادامه یادگیری
              </Link>
            ) : (
              <Link
                href={session ? checkoutHref : `/login?next=${encodeURIComponent(checkoutHref)}`}
                className="academy-btn-primary mt-6 w-full text-center"
              >
                خرید دوره
              </Link>
            )}
          </aside>
        </div>
      </div>
    </AcademyShell>
  );
}
