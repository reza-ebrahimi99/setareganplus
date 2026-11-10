import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMeta } from "@/lib/seo";
import { getClassStudent } from "@/lib/classes/session";
import { drawBankQuiz } from "@/lib/classes/quiz-pool";
import { QuizBox } from "@/components/classes/QuizBox";
import { EmptyState } from "@/components/classes/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return buildMeta({ title: "نمونه سؤال", description: "تمرین بیشتر از همین مبحث، با پاسخ تشریحی.", path: `/classes/${slug}/practice`, noindex: true });
}

export default async function PracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ d?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const course = await prisma.classCourse.findUnique({ where: { slug } });
  if (!course?.published) notFound();
  const student = await getClassStudent();
  const difficulty = [1, 2, 3, 4, 5].includes(Number(sp.d)) ? Number(sp.d) : undefined;
  const enrolled = student ? await prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } } }) : null;
  const ready = !!student && !!enrolled;
  const quiz = ready ? await drawBankQuiz({ courseId: course.id, field: student!.field, count: 15, kind: "practice", ref: course.id, difficulty }) : null;

  return (
    <div className="container-x space-y-5 pb-16">
      <div>
        <Link href={`/classes/${slug}`} className="text-sm font-bold text-[#2f5bea]">بازگشت به {course.title}</Link>
        <h1 className="cl-display mt-2 text-3xl">نمونه سؤال و تمرین بیشتر</h1>
        <p className="cl-muted mt-1 text-sm">۱۵ سؤال از همین مبحث. سختی را عوض کن تا مجموعهٔ تازه‌ای ببینی.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/classes/${slug}/practice`} className={`cl-chip ${!difficulty ? "is-on" : ""}`}>همه</Link>
        {[1, 2, 3, 4, 5].map((d) => <Link key={d} href={`/classes/${slug}/practice?d=${d}`} className={`cl-chip ${difficulty === d ? "is-on" : ""}`}>سختی {d}</Link>)}
      </div>
      {!student && <EmptyState title="برای تمرین وارد شو" text="بعد از ورود و ثبت‌نام در دوره، سؤال‌ها این‌جا باز می‌شوند." href={`/classes/login?next=/classes/${slug}/practice`} action="ورود" />}
      {student && !ready && <EmptyState title="اول در دوره ثبت‌نام کن" text="تمرین برای دانش‌آموزان همین دوره است." href={`/classes/${slug}`} action="صفحهٔ دوره" />}
      {ready && !quiz && <EmptyState title="هنوز سؤالی برای این سختی نیست" text="فیلتر را بردار یا کمی بعد دوباره سر بزن." href={`/classes/${slug}/practice`} action="همهٔ سختی‌ها" />}
      {quiz && <QuizBox token={quiz.token} questions={quiz.questions} heading="تمرین این مبحث" blurb="پاسخ تشریحی بعد از ثبت نمایش داده می‌شود." />}
    </div>
  );
}
