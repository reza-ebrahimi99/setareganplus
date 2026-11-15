import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { jalaliDateTime, prettyPhone } from "@/lib/format";
import { FIELD_LABEL, FOLLOW, GRADE_LABEL, skillBySlug } from "@/lib/journey/catalog";
import { setFollowUp } from "../actions";
import { MathText } from "@/components/journey/MathText";

export const dynamic = "force-dynamic";

export default async function JourneyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("journey.manage");
  const { id } = await params;
  const sp = await searchParams;
  const run = await prisma.journeyRun.findUnique({ where: { id }, include: { answers: { orderBy: { createdAt: "asc" } } } });
  if (!run) notFound();
  if (run.fresh) await prisma.journeyRun.update({ where: { id }, data: { fresh: false } });
  const questions = await prisma.journeyQuestion.findMany({ where: { id: { in: run.answers.map((a) => a.questionId) } }, include: { options: true } });
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/journey" className="text-royal">بازگشت به فهرست</Link></p>
      <h1 className="text-2xl font-extrabold text-navy">{run.name}</h1>
      <p className="mt-1 text-sm text-muted">{prettyPhone(run.mobile)}{run.parentMobile ? ` · همراه خانواده ${prettyPhone(run.parentMobile)}` : ""} · {GRADE_LABEL[run.grade]}{run.field ? ` · ${FIELD_LABEL[run.field]}` : ""}{run.school ? ` · ${run.school}` : ""}</p>
      <p className="text-sm text-muted">{run.finishedAt ? jalaliDateTime(run.finishedAt) : "هنوز تمام نشده"} · {run.status === "DONE" ? "تمام‌شده" : "در جریان"}</p>
      {sp.ok && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">پیگیری ذخیره شد.</p>}
      <form action={setFollowUp} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={run.id} />
        <select name="followUp" defaultValue={run.followUp} className="input w-auto py-2 text-sm">{FOLLOW.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
        <button className="btn-navy px-4 py-2 text-sm">ثبت پیگیری</button>
      </form>
      <div className="mt-6 space-y-3">
        {run.answers.map((a) => {
          const q = byId.get(a.questionId);
          const picked = a.unknown ? "هنوز به این نرسیدم" : q?.options.find((o) => o.id === a.optionId)?.text ?? "";
          const key = q?.options.find((o) => o.correct)?.text ?? "";
          return (
            <article key={a.id} className="rounded-2xl border border-line bg-paper p-4 text-sm">
              <p className="font-bold text-navy">{skillBySlug(a.skillSlug)?.title}{a.drill ? " · پیچ کمکی" : ""}</p>
              <p className="mt-1"><MathText text={q?.stem ?? ""} /></p>
              <p className="mt-2">انتخاب: <MathText text={picked} /></p>
              <p>کلید: <MathText text={key} /></p>
              <p className={a.correct ? "text-emerald-700" : "text-gold-ink"}>{a.correct ? "درست" : a.unknown ? "بلد نبود" : `بدفهمی: ${a.misconception || "—"}`}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
