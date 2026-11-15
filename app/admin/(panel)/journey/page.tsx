import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa, jalaliDateTime } from "@/lib/format";
import { FIELD_LABEL, FOLLOW, GRADE_LABEL, SKILLS, skillBySlug } from "@/lib/journey/catalog";
import { statusOf } from "@/lib/journey/catalog";
import { journeyHighlights } from "@/lib/journey/report";

export const dynamic = "force-dynamic";

export default async function JourneyAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePerm("journey.manage");
  const sp = await searchParams;
  const grade = Number(sp.grade || 0);
  const field = sp.field || "";
  const follow = sp.follow || "";
  const weak = sp.weak || "";
  const q = (sp.q || "").trim();
  const where = {
    status: "DONE" as const,
    ...(grade ? { grade } : {}),
    ...(field ? { field } : {}),
    ...(follow ? { followUp: follow } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { mobile: { contains: q.replace(/\D/g, "") || q } }] } : {}),
  };
  const [rows, fresh, total, answers] = await Promise.all([
    prisma.journeyRun.findMany({ where, orderBy: { finishedAt: "desc" }, include: { answers: true }, take: 200 }),
    prisma.journeyRun.count({ where: { status: "DONE", fresh: true } }),
    prisma.journeyRun.count({ where: { status: "DONE" } }),
    prisma.journeyAnswer.findMany({ where: { drill: false, run: { status: "DONE" } }, select: { skillSlug: true, correct: true, run: { select: { field: true } } } }),
  ]);
  const byField = new Map<string, Map<string, { ok: number; n: number }>>();
  for (const a of answers) {
    const f = a.run.field || "—";
    const m = byField.get(f) ?? new Map();
    const cell = m.get(a.skillSlug) ?? { ok: 0, n: 0 };
    cell.n += 1;
    if (a.correct) cell.ok += 1;
    m.set(a.skillSlug, cell);
    byField.set(f, m);
  }
  const weakest = [...byField.entries()].map(([f, m]) => {
    let worst = "";
    let ratio = 2;
    for (const [slug, cell] of m) {
      const r = cell.n ? cell.ok / cell.n : 1;
      if (r < ratio) { ratio = r; worst = slug; }
    }
    return { field: f, skill: skillBySlug(worst)?.title ?? worst, ratio };
  });
  const filtered = weak ? rows.filter((r) => weakestSkill(r.answers) === weak) : rows;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ grade: sp.grade, field, follow, weak, q })) if (v) qs.set(k, v);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">سفر ستاره‌ها</h1>
          <p className="mt-1 text-sm text-muted">{fa(fresh)} نتیجهٔ تازه · {fa(total)} سفر تمام‌شده</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/journey/questions" className="btn-ghost px-4 py-2 text-sm">معماها</Link>
          <a href={`/admin/journey/export?${qs}`} className="btn-ghost px-4 py-2 text-sm">خروجی اکسل</a>
        </div>
      </div>
      {fresh > 0 && <p className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-bold text-gold-ink">{fa(fresh)} سفر تازه تمام شده و هنوز پیگیری نشده است.</p>}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {weakest.map((w) => (
          <div key={w.field} className="rounded-2xl border border-line bg-paper p-3 text-sm">
            <b className="text-navy">{FIELD_LABEL[w.field] ?? w.field}</b>
            <p className="text-muted">ضعیف‌ترین: {w.skill || "—"}</p>
          </div>
        ))}
      </div>
      <form className="mb-4 grid gap-2 rounded-2xl border border-line bg-paper p-3 sm:grid-cols-3">
        <select name="grade" defaultValue={sp.grade || ""} className="input py-2 text-sm"><option value="">همهٔ پایه‌ها</option>{[5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>{GRADE_LABEL[g]}</option>)}</select>
        <select name="field" defaultValue={field} className="input py-2 text-sm"><option value="">همهٔ رشته‌ها</option><option value="riazi">ریاضی</option><option value="tajrobi">تجربی</option><option value="ensani">انسانی</option></select>
        <select name="follow" defaultValue={follow} className="input py-2 text-sm"><option value="">همهٔ پیگیری‌ها</option>{FOLLOW.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
        <select name="weak" defaultValue={weak} className="input py-2 text-sm"><option value="">ضعیف‌ترین مهارت: همه</option>{SKILLS.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}</select>
        <input name="q" defaultValue={q} placeholder="نام یا موبایل" className="input py-2 text-sm" />
        <button className="btn-navy px-4 py-2 text-sm">اعمال فیلتر</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ivory text-right text-xs text-muted"><tr>
            <th className="p-3">نام</th><th className="p-3">پایه</th><th className="p-3">تاریخ</th><th className="p-3">ضعیف‌ترین</th><th className="p-3">پیگیری</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => {
              const weakSlug = weakestSkill(r.answers);
              const badge = journeyHighlights(r.grade, r.field, r.answers);
              return (
                <tr key={r.id}>
                  <td className="p-3">
                    <Link href={`/admin/journey/${r.id}`} className="font-bold text-navy">{r.name}</Link>
                    {r.fresh && <span className="mr-2 rounded-full bg-gold px-2 text-xs font-bold text-navy">جدید</span>}
                    <p className="text-xs text-muted" dir="ltr">{r.mobile}</p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {badge.rootTitle && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-900">ریشه: {badge.rootTitle}</span>}
                      {badge.topMisconception && <span className="max-w-56 truncate rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950">سرنخ: {badge.topMisconception}</span>}
                    </p>
                  </td>
                  <td className="p-3">{GRADE_LABEL[r.grade]}{r.field ? ` · ${FIELD_LABEL[r.field]}` : ""}</td>
                  <td className="p-3">{r.finishedAt ? jalaliDateTime(r.finishedAt) : ""}</td>
                  <td className="p-3">{skillBySlug(weakSlug)?.title ?? "—"}</td>
                  <td className="p-3">{FOLLOW.find((f) => f.id === r.followUp)?.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function weakestSkill(answers: { skillSlug: string; correct: boolean; drill: boolean }[]) {
  const m = new Map<string, { ok: number; n: number }>();
  for (const a of answers) {
    if (a.drill) continue;
    const c = m.get(a.skillSlug) ?? { ok: 0, n: 0 };
    c.n += 1;
    if (a.correct) c.ok += 1;
    m.set(a.skillSlug, c);
  }
  let worst = "";
  let ratio = 2;
  for (const [slug, c] of m) {
    const r = c.n ? c.ok / c.n : 1;
    if (statusOf(r) && r < ratio) { ratio = r; worst = slug; }
  }
  return worst;
}
