import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { buildMeta } from "@/lib/seo";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd } from "@/lib/ld";
import { siteUrl } from "@/lib/shop/config";
import { canWatchLesson, formatClock, isNewLesson, lessonPath } from "@/lib/classes/catalog";
import { getClassStudent } from "@/lib/classes/session";
import { touchOpen } from "@/lib/classes/watch";
import { renderMath } from "@/lib/classes/math";
import { drawBankQuiz } from "@/lib/classes/quiz-pool";
import { signDraw } from "@/lib/classes/draw";
import { Player } from "@/components/classes/Player";
import { NewChip, PremiumBadge } from "@/components/classes/ui";
import { QuizBox } from "@/components/classes/QuizBox";
import { Upsell } from "@/components/classes/Upsell";
import { askQuestion } from "../../actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lesson: string }> }): Promise<Metadata> {
  const { slug, lesson: hash } = await params;
  const lesson = await prisma.classLesson.findFirst({ where: { aparatHash: hash, course: { slug, published: true }, published: true }, include: { course: true } });
  if (!lesson) return { title: "جلسه" };
  return buildMeta({
    title: `${lesson.title} | ${lesson.course.title}`,
    description: (lesson.description || lesson.course.intro || lesson.title).slice(0, 180),
    path: lessonPath(slug, hash),
  });
}

export default async function LessonPage({ params, searchParams }: { params: Promise<{ slug: string; lesson: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const { slug, lesson: hash } = await params;
  const sp = await searchParams;
  const lesson = await prisma.classLesson.findFirst({
    where: { aparatHash: hash, published: true, course: { slug, published: true } },
    include: {
      course: { include: { lessons: { where: { published: true }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, aparatHash: true, durationSec: true, freePreview: true, isPremium: true, sortOrder: true } } } },
      questions: { where: { published: true }, orderBy: { sortOrder: "asc" }, include: { choices: { orderBy: { sortOrder: "asc" } } } },
      files: { where: { published: true }, orderBy: { sortOrder: "asc" } },
      threads: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "asc" }, include: { replies: { orderBy: { createdAt: "asc" } }, student: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!lesson) notFound();
  const student = await getClassStudent().catch(() => null);
  const enrolled = student ? await prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: lesson.courseId } } }) : null;
  const can = canWatchLesson({ published: true, coursePublished: true, freePreview: lesson.freePreview, loggedIn: !!student, enrolled: !!enrolled });
  const progress = student ? await prisma.classProgress.findUnique({ where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } } }) : null;
  if (can && student) await touchOpen(student.id, lesson.id).catch(() => undefined);
  const mine = student ? await prisma.classThread.findMany({ where: { lessonId: lesson.id, studentId: student.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }) : [];
  const back = lessonPath(slug, hash);
  const iso = lesson.durationSec ? `PT${Math.floor(lesson.durationSec / 60)}M${lesson.durationSec % 60}S` : undefined;

  return (
    <div className="container-x pb-16">
      <JsonLd data={[
        breadcrumbLd([{ name: "کلاس‌های ویدیویی", href: "/classes" }, { name: lesson.course.title, href: `/classes/${slug}` }, { name: lesson.title }]),
        {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: lesson.title,
          description: lesson.description || lesson.course.intro || lesson.title,
          thumbnailUrl: `${siteUrl()}/classes/cover/${lesson.aparatHash}`,
          uploadDate: lesson.createdAt.toISOString(),
          ...(iso ? { duration: iso } : {}),
          embedUrl: `${siteUrl()}${back}`,
        },
      ]} />
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="cl-sticky cl-card cl-syllabus p-3">
          <Link href={`/classes/${slug}`} className="cl-display block px-2 py-2 text-lg">{lesson.course.title}</Link>
          <ol className="mt-1 max-h-[70vh] space-y-1 overflow-auto">
            {lesson.course.lessons.map((l, i) => (
              <li key={l.id}>
                <Link href={lessonPath(slug, l.aparatHash)} aria-current={l.id === lesson.id ? "page" : undefined} className="flex items-center gap-2 px-2 py-2 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-black/5 text-xs font-bold">{fa(i + 1)}</span>
                  <span className="min-w-0 flex-1 font-bold">{l.title}{l.isPremium ? " · HD" : ""}</span>
                  <span className="cl-muted text-xs">{l.durationSec ? fa(formatClock(l.durationSec)) : ""}</span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>
        <div className="space-y-5">
          <div>
            <p className="cl-muted text-sm">{lesson.course.teacher}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="cl-display text-3xl">{lesson.title}</h1>
              {lesson.isPremium && <PremiumBadge />}
              {isNewLesson(lesson.createdAt) && <NewChip />}
            </div>
          </div>
          {sp.e && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{sp.e}</p>}
          {sp.ok === "ask" && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">سؤالت ثبت شد و بعد از تأیید نمایش داده می‌شود.</p>}
          {can ? <Player lessonId={lesson.id} hash={lesson.aparatHash} title={lesson.title} completed={!!progress?.completed} poster={lesson.poster} /> : (
            <div className="cl-card overflow-hidden">
              <div className="relative aspect-video bg-[#07101f]">
                {lesson.poster && <img src={lesson.poster} alt="" className="absolute inset-0 size-full object-cover" />}
                <div className="absolute inset-0 grid place-items-center text-center text-white">
                  <div>
                    <p className="cl-display text-2xl">این جلسه قفل است</p>
                    <p className="mt-2 text-sm text-white/75">{lesson.freePreview ? "برای پیش‌نمایش وارد شو." : "بعد از ثبت‌نام در دوره باز می‌شود."}</p>
                    <Link href={student ? `/classes/${slug}` : `/classes/login?next=${encodeURIComponent(back)}`} className="btn-gold mt-4 inline-flex">{student ? "ثبت‌نام در دوره" : "ورود"}</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {lesson.description && <article className="cl-card p-5 leading-8"><div dangerouslySetInnerHTML={{ __html: renderMath(lesson.description) }} /></article>}
          {can && student && <LessonQuiz lessonId={lesson.id} courseId={lesson.courseId} field={student.field} manual={lesson.questions} />}
          {lesson.files.length > 0 && (
            <section className="cl-card p-5">
              <h2 className="font-extrabold">فایل این جلسه</h2>
              <ul className="mt-2 space-y-2">
                {lesson.files.map((f) => <li key={f.id}>{enrolled ? <a className="font-bold text-[#2f5bea]" href={`/classes/files/${f.id}`}>{f.title}</a> : <Link href={`/classes/${slug}`}>{f.title} — بعد از ثبت‌نام</Link>}</li>)}
              </ul>
            </section>
          )}
          <section className="cl-card space-y-4 p-5">
            <h2 className="cl-display text-xl">پرسش و پاسخ</h2>
            {lesson.threads.length === 0 && mine.length === 0 && <p className="cl-muted text-sm">هنوز سؤال تأییدشده‌ای این‌جا نیست.</p>}
            {lesson.threads.map((t) => (
              <article key={t.id} className="rounded-2xl bg-black/[0.04] p-3">
                <p className="text-sm font-bold">{t.student.firstName} {t.student.lastName.slice(0, 1)}.</p>
                <div className="mt-1 text-sm leading-7" dangerouslySetInnerHTML={{ __html: renderMath(t.body) }} />
                {t.replies.map((r) => (
                  <div key={r.id} className="mt-2 rounded-xl bg-white/70 p-3 text-sm">
                    <b>{r.author}</b>
                    <div dangerouslySetInnerHTML={{ __html: renderMath(r.body) }} />
                  </div>
                ))}
              </article>
            ))}
            {mine.map((t) => <p key={t.id} className="rounded-2xl bg-amber-50 px-3 py-2 text-sm">در انتظار تأیید: {t.body}</p>)}
            {student && can ? (
              <form action={askQuestion.bind(null, lesson.id)} className="space-y-2">
                <textarea name="body" required minLength={5} maxLength={1000} rows={3} className="cl-input" placeholder="سؤالت را بنویس. بعد از تأیید مدرس دیده می‌شود." />
                <button className="btn-navy px-4 py-2 text-sm">فرستادن سؤال</button>
              </form>
            ) : (
              <Link href={`/classes/login?next=${encodeURIComponent(back)}`} className="text-sm font-bold text-[#2f5bea]">برای پرسیدن وارد شو</Link>
            )}
          </section>
          <Upsell slug={lesson.course.bookletSlug} consult={lesson.course.suggestConsult} topic={lesson.course.title} />
        </div>
      </div>
    </div>
  );
}

async function LessonQuiz({ lessonId, courseId, field, manual }: { lessonId: string; courseId: string; field: string | null; manual: { id: string; prompt: string; choices: { id: string; text: string }[] }[] }) {
  const bank = await drawBankQuiz({ courseId, lessonId, field, count: 5, kind: "lesson", ref: lessonId });
  if (bank) return <QuizBox token={bank.token} questions={bank.questions} />;
  const sec = process.env.SESSION_SECRET;
  const rows = manual.slice(0, 5);
  if (!sec || rows.length === 0) return null;
  const token = signDraw({ kind: "lesson", ref: lessonId, ids: rows.map((q) => q.id), exp: Date.now() + 2 * 60 * 60 * 1000 }, sec);
  return <QuizBox token={token} questions={rows.map((q) => ({ id: q.id, html: renderMath(q.prompt), choices: q.choices.map((c) => ({ id: c.id, html: renderMath(c.text) })) }))} />;
}
