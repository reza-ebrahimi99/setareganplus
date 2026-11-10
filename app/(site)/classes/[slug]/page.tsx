import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { buildMeta } from "@/lib/seo";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd } from "@/lib/ld";
import { siteUrl } from "@/lib/shop/config";
import { chargeRials, formatClock, formatLength, lessonPath } from "@/lib/classes/catalog";
import { getClassStudent } from "@/lib/classes/session";
import { Cover, MetaLine, PriceTag, Ring } from "@/components/classes/ui";
import { enrollAction, checkoutAction } from "../actions";
import { lessonFraction } from "@/lib/classes/catalog";
import { Upsell } from "@/components/classes/Upsell";

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
  for (const a of attempts) if (!best.has(a.lessonId)) best.set(a.lessonId, a);
  const seconds = course.lessons.reduce((s, l) => s + (l.durationSec || 0), 0);
  const fractions = course.lessons.map((l) => {
    const p = prog.get(l.id);
    const q = best.get(l.id);
    return lessonFraction({ watchedSec: p?.secondsWatched ?? 0, durationSec: l.durationSec, completed: !!p?.completed, quizScore: q?.score ?? null, quizTotal: q?.total ?? null, hasQuiz: l.questions.length > 0 });
  });
  const overall = fractions.length ? fractions.reduce((s, n) => s + n, 0) / fractions.length : 0;
  const price = chargeRials(course);
  const nextLesson = course.lessons.find((l) => !prog.get(l.id)?.completed) || course.lessons[0];

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
            <Cover slug={course.slug} title={course.title} teacher={course.teacher} cover={course.cover} />
            <div className="relative space-y-3 px-6 py-6">
              <p className="text-sm font-bold text-[#f4b21b]">{course.teacher}</p>
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
            <h2 className="cl-display text-2xl">سرفصل‌ها</h2>
            <ol className="mt-3 space-y-2">
              {course.lessons.map((l, i) => {
                const p = prog.get(l.id);
                const open = l.freePreview || !!enrolled;
                return (
                  <li key={l.id}>
                    <Link href={lessonPath(course.slug, l.aparatHash)} className="cl-card cl-lift flex items-center gap-3 px-4 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-black/5 text-sm font-extrabold">{fa(i + 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold">{l.title}</span>
                        <span className="cl-muted text-xs">{l.durationSec ? fa(formatClock(l.durationSec)) : "زمان نامشخص"}{l.questions.length > 0 ? " · آزمون" : ""}{l.freePreview ? " · پیش‌نمایش" : ""}{!open ? " · قفل" : ""}</span>
                      </span>
                      {p?.completed && <span className="text-sm font-bold text-emerald-600">✓</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
          {course.files.length > 0 && (
            <section className="cl-card mt-6 p-5">
              <h2 className="font-extrabold">فایل‌های دوره</h2>
              <ul className="mt-2 space-y-2">
                {course.files.map((f) => <li key={f.id}><Link className="font-bold text-[#2f5bea]" href={student && enrolled ? `/classes/files/${f.id}` : `/classes/login?next=/classes/files/${f.id}`}>{f.title}</Link></li>)}
              </ul>
            </section>
          )}
        </div>
        <aside className="cl-sticky space-y-4">
          <div className="cl-card p-5">
            <PriceTag course={course} />
            <p className="cl-muted mt-2 text-sm">{seconds > 0 ? fa(formatLength(seconds)) : "چند جلسه"} · {fa(course.lessons.length)} جلسه</p>
            {student && enrolled && <div className="mt-4"><Ring value={overall} /></div>}
            <div className="mt-4 grid gap-2">
              {!student && <Link href={`/classes/login?next=/classes/${course.slug}`} className="btn-gold text-center">ورود و ثبت‌نام</Link>}
              {student && !enrolled && price <= 0 && (
                <form action={enrollAction.bind(null, course.id)}><button className="btn-gold w-full">ثبت‌نام رایگان</button></form>
              )}
              {student && !enrolled && price > 0 && (
                <form action={checkoutAction.bind(null, course.id)}><button className="btn-gold w-full">پرداخت و ثبت‌نام</button></form>
              )}
              {student && enrolled && nextLesson && <Link href={lessonPath(course.slug, nextLesson.aparatHash)} className="btn-primary text-center">ادامهٔ تماشا</Link>}
            </div>
          </div>
          <Upsell slug={course.bookletSlug} consult={course.suggestConsult} topic={course.title} />
        </aside>
      </div>
    </div>
  );
}

