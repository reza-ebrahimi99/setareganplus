import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fa, jalaliDateTime } from "@/lib/format";
import { buildMeta } from "@/lib/seo";
import { BADGES, lessonFraction, lessonPath } from "@/lib/classes/catalog";
import { getClassStudent } from "@/lib/classes/session";
import { EmptyState, Ring } from "@/components/classes/ui";
import { logoutClass } from "../actions";

export const metadata: Metadata = buildMeta({ title: "دوره‌های من", description: "پیشرفت، امتیاز و گواهی‌های کلاس‌های ویدیویی.", path: "/classes/me", noindex: true });

export default async function MePage() {
  const student = await getClassStudent().catch(() => null);
  if (!student) {
    return <div className="container-x pb-16"><EmptyState title="هنوز وارد نشدی" text="با شماره موبایل وارد شو تا دوره‌ها، امتیاز و ادامهٔ تماشا این‌جا باشد." href="/classes/login?next=/classes/me" action="ورود" /></div>;
  }
  const [enrolls, continueRows, badges, certs, pathRow] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { studentId: student.id },
      include: { course: { include: { lessons: { where: { published: true }, include: { questions: { where: { published: true }, select: { id: true } } } } } } },
    }),
    prisma.classProgress.findMany({
      where: { studentId: student.id, completed: false, secondsWatched: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { lesson: { include: { course: { select: { slug: true, title: true, published: true } } } } },
    }),
    prisma.classBadge.findMany({ where: { studentId: student.id }, orderBy: { earnedAt: "desc" } }),
    prisma.classCertificate.findMany({ where: { studentId: student.id }, include: { course: { select: { title: true } } }, orderBy: { issuedAt: "desc" } }),
    prisma.classPath.findFirst({ where: { published: true, grade: student.grade, field: student.field || "" }, include: { steps: { orderBy: { sortOrder: "asc" }, include: { course: true } } } }),
  ]);
  const [attempts, progressRows] = await Promise.all([
    prisma.quizAttempt.findMany({ where: { studentId: student.id }, orderBy: { score: "desc" } }),
    prisma.classProgress.findMany({ where: { studentId: student.id } }),
  ]);
  const prog = new Map(progressRows.map((p) => [p.lessonId, p]));
  const best = new Map<string, { score: number; total: number }>();
  for (const a of attempts) if (a.lessonId && !best.has(a.lessonId)) best.set(a.lessonId, a);

  return (
    <div className="container-x space-y-6 pb-16">
      <section className="cl-hero px-6 py-8">
        <p className="relative text-sm font-bold text-[#f4b21b]">سلام {student.firstName}</p>
        <h1 className="cl-display relative text-4xl text-white">دوره‌های من</h1>
        <div className="relative mt-4 flex flex-wrap gap-3 text-sm">
          <span className="cl-badge cl-badge-gold">{fa(student.points)} امتیاز</span>
          <span className="cl-badge">{fa(student.streak)} روز پیاپی</span>
        </div>
      </section>
      {continueRows.length > 0 && (
        <section>
          <h2 className="cl-display text-2xl">ادامهٔ تماشا</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {continueRows.filter((r) => r.lesson.course.published).map((r) => (
              <Link key={r.id} href={lessonPath(r.lesson.course.slug, r.lesson.aparatHash)} className="cl-card cl-lift p-4">
                <p className="cl-muted text-xs">{r.lesson.course.title}</p>
                <p className="font-extrabold">{r.lesson.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="cl-display text-2xl">دوره‌های ثبت‌نام‌شده</h2>
        {enrolls.length === 0 ? <div className="mt-3"><EmptyState title="هنوز دوره‌ای نداری" text="یک دورهٔ رایگان را باز کن و ثبت‌نام کن." href="/classes" action="دیدن دوره‌ها" /></div> : (
          <div className="mt-3 grid gap-3">
            {enrolls.map((e) => {
              const lessons = e.course.lessons;
              const frac = lessons.length ? lessons.reduce((s, l) => s + lessonFraction({ watchedSec: prog.get(l.id)?.secondsWatched ?? 0, durationSec: l.durationSec, completed: !!prog.get(l.id)?.completed, quizScore: best.get(l.id)?.score ?? null, quizTotal: best.get(l.id)?.total ?? null, hasQuiz: l.questions.length > 0 }), 0) / lessons.length : 0;
              return (
                <Link key={e.id} href={`/classes/${e.course.slug}`} className="cl-card flex items-center justify-between gap-3 p-4">
                  <span>
                    <b className="block">{e.course.title}</b>
                    <span className="cl-muted text-sm">{fa(lessons.length)} جلسه</span>
                  </span>
                  <Ring value={frac} />
                </Link>
              );
            })}
          </div>
        )}
      </section>
      {pathRow && pathRow.steps.length > 0 && (
        <section className="cl-card p-5">
          <h2 className="font-extrabold">مسیر پیشنهادی</h2>
          <ol className="mt-3 space-y-2">
            {pathRow.steps.filter((s) => s.course.published).map((s, i) => (
              <li key={s.id}><Link href={`/classes/${s.course.slug}`} className="font-bold">{fa(i + 1)}. {s.course.title}</Link>{s.note ? <span className="cl-muted text-sm"> — {s.note}</span> : null}</li>
            ))}
          </ol>
        </section>
      )}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="cl-card p-5">
          <h2 className="font-extrabold">نشان‌ها</h2>
          {badges.length === 0 ? <p className="cl-muted mt-2 text-sm">با ۷ روز پیاپی یا تمام کردن یک دوره نشان می‌گیری.</p> : (
            <ul className="mt-3 space-y-2">{badges.map((b) => <li key={b.id} className="rounded-2xl bg-black/[0.04] px-3 py-2"><b>{BADGES[b.kind as keyof typeof BADGES]?.title || b.kind}</b><span className="cl-muted block text-xs">{BADGES[b.kind as keyof typeof BADGES]?.text}</span></li>)}</ul>
          )}
        </div>
        <div className="cl-card p-5">
          <h2 className="font-extrabold">گواهی‌ها</h2>
          {certs.length === 0 ? <p className="cl-muted mt-2 text-sm">وقتی همهٔ جلسه‌ها و آزمون‌های یک دوره تمام شود، گواهی ساخته می‌شود.</p> : (
            <ul className="mt-3 space-y-2">{certs.map((c) => <li key={c.id}><Link href={`/classes/certificate/${c.code}`} className="font-bold text-[#2f5bea]">{c.course.title}</Link><span className="cl-muted block text-xs">{jalaliDateTime(c.issuedAt)} · {c.code}</span></li>)}</ul>
          )}
        </div>
      </section>
      <form action={logoutClass}><button className="text-sm font-bold text-red-700">خروج از حساب</button></form>
    </div>
  );
}
