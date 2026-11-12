import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { buildMeta } from "@/lib/seo";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd } from "@/lib/ld";
import { siteUrl } from "@/lib/shop/config";
import { chargeRials, classJoinPath, courseShowsPremium, formatClock, formatLength, isNewLesson, lessonPath, orderLessons, presentPrice } from "@/lib/classes/catalog";
import { getClassStudent } from "@/lib/classes/session";
import { Cover, MetaLine, NewChip, PremiumBadge, PriceTag, Ring } from "@/components/classes/ui";
import { checkoutAction } from "../actions";
import { CourseFileList, MultivitaminFiles, splitCourseFiles } from "@/components/classes/Files";
import { lessonFraction } from "@/lib/classes/catalog";
import { Upsell } from "@/components/classes/Upsell";
import { renderMath } from "@/lib/classes/math";

type SP = { ok?: string; e?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.classCourse.findUnique({ where: { slug } });
  if (!course || !course.published) return { title: "دوره" };
  return buildMeta({ title: `${course.title} | کلاس‌های ویدیویی`, description: (course.intro || course.summary || course.title).slice(0, 180), path: `/classes/${slug}` });
}

export default async function CoursePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const course = await prisma.classCourse.findUnique({
    where: { slug },
    include: {
      lessons: { where: { published: true }, orderBy: { sortOrder: "asc" }, include: { questions: { where: { published: true }, select: { id: true } } } },
      files: { where: { published: true, lessonId: null }, orderBy: { sortOrder: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course || !course.published) notFound();
  const student = await getClassStudent().catch(() => null);
  const [enrolled, progress, attempts] = student
    ? await Promise.all([
        prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } } }),
        prisma.classProgress.findMany({ where: { studentId: student.id, lessonId: { in: course.lessons.map((l) => l.id) } } }),
        prisma.quizAttempt.findMany({ where: { studentId: student.id, lessonId: { in: course.lessons.map((l) => l.id) } }, orderBy: { score: "desc" } }),
      ])
    : [null, [], []];
  const prog = new Map(progress.map((p) => [p.lessonId, p]));
  const best = new Map<string, { score: number; total: number }>();
  for (const a of attempts) if (a.lessonId && !best.has(a.lessonId)) best.set(a.lessonId, a);
  const ordered = orderLessons(course.lessons);
  const premiumLessons = ordered.filter((l) => l.isPremium);
  const olderLessons = ordered.filter((l) => !l.isPremium);
  const showsPremium = courseShowsPremium(course, course.lessons);
  const priced = presentPrice(course, showsPremium);
  const seconds = course.lessons.reduce((s, l) => s + (l.durationSec || 0), 0);
  const fractions = course.lessons.map((l) => {
    const p = prog.get(l.id);
    const q = best.get(l.id);
    return lessonFraction({ watchedSec: p?.secondsWatched ?? 0, durationSec: l.durationSec, completed: !!p?.completed, quizScore: q?.score ?? null, quizTotal: q?.total ?? null, hasQuiz: l.questions.length > 0 });
  });
  const overall = fractions.length ? fractions.reduce((s, n) => s + n, 0) / fractions.length : 0;
  const price = chargeRials(priced);
  const nextLesson = ordered.find((l) => !prog.get(l.id)?.completed) || ordered[0];
  const sheets = splitCourseFiles(course.files);

  return (
    <div className="container-x pb-16">
      <JsonLd data={[
        breadcrumbLd([{ name: "کلاس‌های ویدیویی", href: "/classes" }, { name: course.title }]),
        {
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.intro || course.summary,
          provider: { "@type": "Organization", name: "ستارگان پلاس", sameAs: siteUrl() },
          offers: { "@type": "Offer", price: String(price), priceCurrency: "IRR", availability: "https://schema.org/InStock" },
        },
      ]} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <section className="cl-hero overflow-hidden">
            <Cover slug={course.slug} title={course.title} teacher={course.teacher} cover={course.cover || premiumLessons.find((l) => l.poster)?.poster} />
            <div className="relative space-y-3 px-6 py-6">
              <p className="text-sm font-bold text-[#f4b21b]">{course.teacher}</p>
              <div className="mb-2 flex flex-wrap items-center gap-2">{showsPremium && <PremiumBadge />}</div>
              <h1 className="cl-display text-4xl text-white">{course.title}</h1>
              <p className="text-white/75"><MetaLine lessons={course.lessons.length} seconds={seconds} grades={course.grades} fields={course.fields} /></p>
              <p className="text-sm text-white/70">{fa(course._count.enrollments)} دانش‌آموز</p>
            </div>
          </section>
          {sp.e && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{sp.e === "pay" ? "این دوره پرداختی است." : sp.e}</p>}
          {sp.ok && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">ثبت‌نامت انجام شد. از اولین جلسه شروع کن.</p>}
          <article className="cl-card mt-6 p-6">
            <h2 className="cl-display text-2xl">دربارهٔ دوره</h2>
            <p className="mt-3 leading-8">{course.intro}</p>
          </article>
          <section className="mt-6">
            {premiumLessons.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-2"><h2 className="cl-display text-2xl">ستارگان پلاس پریمیوم</h2><PremiumBadge /></div>
                <ol className="mt-3 space-y-2">{premiumLessons.map((l, i) => <LessonRow key={l.id} lesson={l} index={i} enrolled={!!enrolled} done={!!prog.get(l.id)?.completed} slug={course.slug} />)}</ol>
              </>
            )}
            {olderLessons.length > 0 && (
              <>
                <h2 className={`cl-display text-2xl ${premiumLessons.length ? "mt-8" : ""}`}>{premiumLessons.length ? "نسخهٔ قبلی" : "سرفصل‌ها"}</h2>
                <ol className="mt-3 space-y-2">{olderLessons.map((l, i) => <LessonRow key={l.id} lesson={l} index={i} enrolled={!!enrolled} done={!!prog.get(l.id)?.completed} slug={course.slug} />)}</ol>
              </>
            )}
          </section>
          <MultivitaminFiles files={sheets.vitamin} slug={course.slug} loggedIn={!!student} enrolled={!!enrolled} />
          <CourseFileList files={sheets.booklets} slug={course.slug} loggedIn={!!student} enrolled={!!enrolled} />
        </div>
        <aside className="cl-sticky space-y-4">
          <div className="cl-card p-5">
            <PriceTag course={priced} />
            <p className="cl-muted mt-2 text-sm">{seconds > 0 ? fa(formatLength(seconds)) : "چند جلسه"} · {fa(course.lessons.length)} جلسه</p>
            {student && enrolled && <div className="mt-4"><Ring value={overall} /></div>}
            <div className="mt-4 grid gap-2">
              {!student && <Link href={classJoinPath(course.slug)} className="btn-gold text-center">ورود و ثبت‌نام</Link>}
              {student && !enrolled && price <= 0 && (
                <Link href={classJoinPath(course.slug)} className="btn-gold text-center">ثبت‌نام در دوره</Link>
              )}
              {student && !enrolled && price > 0 && (
                <form action={checkoutAction.bind(null, course.id)}><button className="btn-gold w-full">پرداخت و ثبت‌نام</button></form>
              )}
              {student && enrolled && nextLesson && <Link href={lessonPath(course.slug, nextLesson.aparatHash)} className="btn-primary text-center">ادامهٔ تماشا</Link>}
              {student && enrolled && <Link href="/classes/me" className="btn-ghost text-center">دوره‌های من</Link>}
            <Link href={`/classes/${course.slug}/practice`} className="btn-ghost text-center">نمونه سؤال و تمرین بیشتر</Link>
            </div>
          </div>
          <Upsell slug={course.bookletSlug} consult={course.suggestConsult} topic={course.title} />
        </aside>
      </div>
    </div>
  );
}

function LessonRow({ lesson, index, enrolled, done, slug }: { lesson: { aparatHash: string; title: string; description: string | null; durationSec: number | null; poster: string | null; questions: { id: string }[]; freePreview: boolean; isPremium: boolean; createdAt: Date }; index: number; enrolled: boolean; done: boolean; slug: string }) {
  const open = lesson.freePreview || enrolled;
  const about = lesson.description?.trim();
  return (
    <li>
      <Link href={lessonPath(slug, lesson.aparatHash)} className="cl-card cl-lift flex items-center gap-3 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-black/5 text-sm font-extrabold">{fa(index + 1)}</span>
        {lesson.poster && <img src={lesson.poster} alt="" className="h-14 w-24 shrink-0 rounded-xl object-cover" />}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-extrabold">{lesson.title}{lesson.isPremium && <PremiumBadge />}{isNewLesson(lesson.createdAt) && <NewChip />}</span>
          {about && (
            <span className="cl-muted mt-1 flex items-start gap-1.5 text-xs leading-5 sm:text-sm">
              <svg viewBox="0 0 24 24" className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" strokeLinejoin="round" />
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20" />
              </svg>
              <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: renderMath(about) }} />
            </span>
          )}
          <span className="cl-muted mt-1 block text-xs">{lesson.durationSec ? fa(formatClock(lesson.durationSec)) : "زمان نامشخص"}{lesson.questions.length > 0 ? " · آزمون" : ""}{lesson.freePreview ? " · پیش‌نمایش" : ""}{!open ? " · قفل" : ""}</span>
        </span>
        {done && <span className="text-sm font-bold text-emerald-600">✓</span>}
      </Link>
    </li>
  );
}

