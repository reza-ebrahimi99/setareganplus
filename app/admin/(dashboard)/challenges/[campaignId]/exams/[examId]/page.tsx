import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveChallengeQuestionAction,
  createChallengeQuestionAction,
  toggleChallengeExamPublicationAction,
  updateChallengeQuestionAction,
} from "@/app/admin/(dashboard)/challenges/actions";
import { ChallengeActionForm } from "@/components/admin/challenge/ChallengeActionForm";
import { MathText } from "@/components/math/MathText";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ campaignId: string; examId: string }> };

export default async function AdminChallengeExamPage({ params }: Props) {
  const session = await requirePermission("challenges.view");
  const canManage = hasPermission(session, "challenges.manage");
  const { campaignId, examId } = await params;
  const exam = await prisma.challengeExam.findFirst({
    where: {
      id: examId,
      campaignId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    include: {
      campaign: { select: { title: true, teamSize: true } },
      questions: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { choices: { orderBy: { sortOrder: "asc" } } },
      },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) notFound();
  const questionsPerMember = exam.questionLimit ?? 10;
  const requiredBankSize = questionsPerMember * exam.campaign.teamSize;
  const bankIsReady = exam.questions.length >= requiredBankSize;

  return (
    <div className="space-y-7" dir="rtl">
      <div>
        <Link href={`/admin/challenges/${campaignId}`} className="text-xs text-blue-700">بازگشت به کمپین</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">{exam.title}</h1><p className="mt-1 text-sm text-muted">{exam.gradeLabel}{exam.majorLabel ? ` · ${exam.majorLabel}` : ""} · {exam.durationMinutes} دقیقه · {exam._count.attempts} تلاش</p></div>
          {canManage ? (
            <ChallengeActionForm
              action={toggleChallengeExamPublicationAction}
              className="space-y-2"
              submitLabel={exam.isPublished ? "توقف انتشار" : "انتشار آزمون"}
              pendingLabel="در حال تغییر وضعیت…"
              submitClassName={exam.isPublished ? "rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-700" : "rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"}
            >
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="examId" value={examId} />
              <input type="hidden" name="publish" value={exam.isPublished ? "false" : "true"} />
            </ChallengeActionForm>
          ) : null}
        </div>
      </div>

      <section className={bankIsReady ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4" : "rounded-xl border border-amber-200 bg-amber-50 p-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">بانک سؤال: {exam.questions.length.toLocaleString("fa-IR")} از حداقل {requiredBankSize.toLocaleString("fa-IR")} سؤال</h2>
            <p className="mt-1 text-xs leading-6 text-muted">برای هر عضو {questionsPerMember.toLocaleString("fa-IR")} سؤال جدا در نظر گرفته می‌شود؛ با تکمیل این تعداد، سؤال‌های پنج عضو تیم همپوشانی ندارند.</p>
          </div>
          <span className={bankIsReady ? "rounded-full bg-emerald-700 px-3 py-1 text-xs text-white" : "rounded-full bg-amber-600 px-3 py-1 text-xs text-white"}>{bankIsReady ? "آماده آزمون" : `${(requiredBankSize - exam.questions.length).toLocaleString("fa-IR")} سؤال باقی مانده`}</span>
        </div>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="text-lg font-bold">سؤال‌ها ({exam.questions.length})</h2>
        <div className="mt-4 space-y-4">
          {exam.questions.map((question, index) => (
            <article key={question.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold">{index + 1}</span>
                {canManage && exam._count.attempts === 0 ? (
                  <ChallengeActionForm
                    action={archiveChallengeQuestionAction}
                    submitLabel="حذف"
                    pendingLabel="در حال حذف…"
                    submitClassName="text-xs text-red-700"
                  >
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="examId" value={examId} />
                    <input type="hidden" name="questionId" value={question.id} />
                  </ChallengeActionForm>
                ) : null}
              </div>
              {question.imageUrl ? (
                <>
                  {/* Arbitrary admin-supplied URLs are intentionally rendered without Next image-host allowlisting. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.imageUrl}
                    alt={`تصویر سؤال ${index + 1}`}
                    className="mx-auto mt-3 max-h-96 w-auto max-w-full rounded-xl border bg-white object-contain"
                  />
                </>
              ) : null}
              {question.prompt ? (
                <h3 className="mt-3 font-semibold leading-8"><MathText text={question.prompt} /></h3>
              ) : (
                <p className="mt-3 text-xs text-muted">این سؤال فقط با تصویر نمایش داده می‌شود.</p>
              )}
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.choices.map((choice) => (
                  <li key={choice.id} className={choice.isCorrect ? "rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-800" : "rounded-lg bg-slate-50 p-2 text-sm"}>
                    {choice.isCorrect ? "✓ " : ""}<MathText text={choice.label} />
                  </li>
                ))}
              </ol>
              {question.explanation ? <p className="mt-3 text-xs text-muted">توضیح: {question.explanation}</p> : null}
              {canManage && exam._count.attempts === 0 ? (
                <details className="mt-4 rounded-xl border border-dashed bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-blue-700">ویرایش سؤال</summary>
                  <ChallengeActionForm
                    action={updateChallengeQuestionAction}
                    className="mt-4 space-y-4"
                    submitLabel="ذخیره تغییرات سؤال"
                    pendingLabel="در حال ذخیره سؤال…"
                  >
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="examId" value={examId} />
                    <input type="hidden" name="questionId" value={question.id} />
                    <label className="block text-sm">متن سؤال (اگر تصویر کامل است، اختیاری)<textarea name="prompt" rows={3} defaultValue={question.prompt} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-sm">بارگذاری تصویر جدید<input name="questionImage" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm" /><small className="mt-1 block text-muted">JPG، PNG یا WebP تا ۸ مگابایت</small></label>
                      <label className="block text-sm">یا آدرس تصویر<input name="imageUrl" type="text" dir="ltr" defaultValue={question.imageUrl ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 text-left" /><small className="mt-1 block text-muted">برای حذف تصویر، این کادر را پاک کنید.</small></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[0, 1, 2, 3].map((choiceIndex) => <label key={choiceIndex} className="text-sm">گزینه {choiceIndex + 1}<input name={`choice${choiceIndex}`} required={choiceIndex < 2} defaultValue={question.choices[choiceIndex]?.label ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>)}
                    </div>
                    <p className="rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-800" dir="rtl">فرمول ریاضی: برای کسر <code dir="ltr">\frac{'{1}'}{'{2}'}</code>، برای رادیکال <code dir="ltr">\sqrt{'{3}'}</code> و برای توان <code dir="ltr">x^2</code> بنویسید.</p>
                    <label className="block text-sm">گزینه درست<select name="correctIndex" defaultValue={String(Math.max(0, question.choices.findIndex((choice) => choice.isCorrect)))} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="0">گزینه ۱</option><option value="1">گزینه ۲</option><option value="2">گزینه ۳</option><option value="3">گزینه ۴</option></select></label>
                    <label className="block text-sm">توضیح پاسخ (اختیاری)<textarea name="explanation" rows={2} defaultValue={question.explanation ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
                  </ChallengeActionForm>
                </details>
              ) : null}
            </article>
          ))}
          {exam.questions.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted">هنوز سؤالی اضافه نشده است.</p> : null}
        </div>
      </section>

      {canManage ? (
        <section className="rounded-xl border bg-surface p-5">
          <h2 className="text-lg font-bold">افزودن سؤال چهارگزینه‌ای</h2>
          {exam._count.attempts > 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">به‌دلیل ثبت تلاش دانش‌آموز، افزودن و ویرایش سؤال برای حفظ صحت نتایج قفل شده است.</p>
          ) : (
          <ChallengeActionForm
            action={createChallengeQuestionAction}
            className="mt-4 space-y-4"
            submitLabel="ثبت سؤال"
            pendingLabel="در حال ثبت سؤال…"
            resetOnSuccess
          >
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="examId" value={examId} />
            <label className="block text-sm">متن سؤال (اگر تصویر کامل است، اختیاری)<textarea name="prompt" rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">تصویر صورت سؤال (اختیاری)<input name="questionImage" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm" /><small className="mt-1 block text-muted">JPG، PNG یا WebP تا ۸ مگابایت</small></label>
              <label className="block text-sm">یا آدرس تصویر<input name="imageUrl" type="text" dir="ltr" className="mt-1 w-full rounded-lg border px-3 py-2 text-left" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => <label key={index} className="text-sm">گزینه {index + 1}<input name={`choice${index}`} required={index < 2} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>)}
            </div>
            <p className="rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-800" dir="rtl">فرمول ریاضی: برای کسر <code dir="ltr">\frac{'{1}'}{'{2}'}</code>، برای رادیکال <code dir="ltr">\sqrt{'{3}'}</code> و برای توان <code dir="ltr">x^2</code> بنویسید.</p>
            <label className="block text-sm">شماره گزینه درست<select name="correctIndex" className="mt-1 w-full rounded-lg border px-3 py-2"><option value="0">گزینه ۱</option><option value="1">گزینه ۲</option><option value="2">گزینه ۳</option><option value="3">گزینه ۴</option></select></label>
            <label className="block text-sm">توضیح پاسخ (اختیاری)<textarea name="explanation" rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          </ChallengeActionForm>
          )}
        </section>
      ) : null}
    </div>
  );
}
