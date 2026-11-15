import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { SKILLS } from "@/lib/journey/catalog";
import { hideQuestion, saveQuestion } from "../actions";

export const dynamic = "force-dynamic";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string; edit?: string }> }) {
  await requirePerm("journey.manage");
  const sp = await searchParams;
  const rows = await prisma.journeyQuestion.findMany({ orderBy: [{ skillSlug: "asc" }, { sortOrder: "asc" }], include: { options: { orderBy: { sortOrder: "asc" } }, skill: true } });
  const editing = rows.find((r) => r.id === sp.edit);
  const opts = editing ? [...editing.options].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  return (
    <>
      <h1 className="text-2xl font-extrabold text-navy">معماهای سفر</h1>
      <p className="mt-1 mb-4 text-sm text-muted">کلید هر معما فقط اینجاست. دانش‌آموز آن را نمی‌بیند.</p>
      {sp.ok && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">ذخیره شد.</p>}
      {sp.e && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800">متن معما، توضیح و هر چهار گزینه لازم است.</p>}
      <form action={saveQuestion} className="mb-6 grid gap-2 rounded-2xl border border-line bg-paper p-4">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <select name="skillSlug" defaultValue={editing?.skillSlug ?? SKILLS[0].slug} className="input">{SKILLS.map((s) => <option key={s.slug} value={s.slug}>{s.title} · کتاب {s.taughtGrade}</option>)}</select>
        <textarea name="stem" required rows={2} defaultValue={editing?.stem ?? ""} placeholder="متن معما. فرمول را بین $ بگذار." className="input" />
        <textarea name="explain" required rows={2} defaultValue={editing?.explain ?? ""} placeholder="توضیح آرام برای دانش‌آموز" className="input" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input name={`opt${i}`} required defaultValue={opts[i]?.text ?? ""} placeholder={`گزینه ${i + 1}`} className="input" />
            <input name={`miss${i}`} defaultValue={opts[i]?.misconception ?? ""} placeholder="بدفهمی، اگر این گزینه غلط است" className="input" />
            <label className="flex items-center gap-1 text-sm font-bold"><input type="radio" name="correct" value={i} defaultChecked={opts[i]?.correct ?? i === 0} /> کلید</label>
          </div>
        ))}
        <button className="btn-navy px-4 py-2 text-sm">{editing ? "ویرایش معما" : "افزودن معما"}</button>
      </form>
      <div className="space-y-2">
        {rows.filter((r) => r.active).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper p-3 text-sm">
            <div>
              <b className="text-navy">{r.skill.title}</b>
              <p className="text-muted">{r.stem.slice(0, 90)}</p>
            </div>
            <div className="flex gap-2">
              <a href={`/admin/journey/questions?edit=${r.id}`} className="btn-ghost px-3 py-1 text-xs">ویرایش</a>
              <form action={hideQuestion}><input type="hidden" name="id" value={r.id} /><button className="text-xs font-bold text-gc">حذف</button></form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
