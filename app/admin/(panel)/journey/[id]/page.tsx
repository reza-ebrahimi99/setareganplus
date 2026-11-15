import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { jalaliDateTime } from "@/lib/format";
import { FOLLOW } from "@/lib/journey/catalog";
import { buildJourneyReport, type ReportQuestion } from "@/lib/journey/report";
import { JourneyReportView } from "@/components/admin/JourneyReportView";
import { PrintButton } from "@/components/admin/PrintButton";
import { saveJourneyNote, setFollowUp } from "../actions";
import "../report.css";

export const dynamic = "force-dynamic";

export default async function JourneyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("journey.manage");
  const { id } = await params;
  const sp = await searchParams;
  const run = await prisma.journeyRun.findUnique({ where: { id }, include: { answers: { orderBy: { createdAt: "asc" } } } });
  if (!run) notFound();
  if (run.fresh) await prisma.journeyRun.update({ where: { id }, data: { fresh: false } });
  const questions = await prisma.journeyQuestion.findMany({
    where: { id: { in: run.answers.map((a) => a.questionId) } },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  const bank = new Map<string, ReportQuestion>(questions.map((q) => [q.id, {
    stem: q.stem,
    explain: q.explain,
    options: q.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct })),
  }]));
  const state = (run.state ?? {}) as { queue?: { skill: string; ids: string[]; drill: boolean }[]; cursor?: number };
  const report = buildJourneyReport({
    name: run.name,
    grade: run.grade,
    field: run.field,
    school: run.school,
    mobile: run.mobile,
    parentMobile: run.parentMobile,
    status: run.status,
    followUp: run.followUp,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
    adminNote: run.adminNote,
    state,
    answers: run.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      skillSlug: a.skillSlug,
      optionId: a.optionId,
      correct: a.correct,
      unknown: a.unknown,
      misconception: a.misconception,
      drill: a.drill,
      createdAt: a.createdAt,
      durationMs: a.durationMs,
    })),
    questions: bank,
  });
  const when = jalaliDateTime(run.finishedAt ?? run.createdAt);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/journey" className="text-sm text-royal">بازگشت به فهرست</Link>
        <PrintButton />
      </div>
      {sp.ok && <p className="no-print mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">ذخیره شد.</p>}
      <JourneyReportView report={report} name={run.name} mobile={run.mobile} parentMobile={run.parentMobile} when={when}>
        <form action={setFollowUp} className="no-print mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={run.id} />
          <select name="followUp" defaultValue={run.followUp} className="input w-auto py-2 text-sm">{FOLLOW.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
          <button className="btn-navy px-4 py-2 text-sm">ثبت پیگیری</button>
        </form>
        <form action={saveJourneyNote} className="no-print mt-3">
          <input type="hidden" name="id" value={run.id} />
          <label className="text-sm font-bold text-navy" htmlFor="adminNote">یادداشت جلسه</label>
          <textarea id="adminNote" name="adminNote" defaultValue={run.adminNote} rows={3} className="input mt-2 leading-7" placeholder="قرار جلسه، قول خانواده، یا چیزی که نباید فراموش شود" />
          <button className="btn-navy mt-2 px-4 py-2 text-sm">ذخیرهٔ یادداشت</button>
        </form>
      </JourneyReportView>
        {run.adminNote && (
        <section className="jr-print-note mt-4 rounded-2xl border border-line p-4">
          <h2 className="font-extrabold text-navy">یادداشت جلسه</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{run.adminNote}</p>
        </section>
      )}
    </>
  );
}
