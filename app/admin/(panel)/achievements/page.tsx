/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { PageTitle, Flash } from "@/components/admin/ui";

export default async function AchList({ searchParams }: { searchParams: Promise<{ ok?: string; q?: string; c?: string }> }) {
  const { ok, q = "", c = "" } = await searchParams;
  const items = await prisma.achievement.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q } }, { detail: { contains: q } }] } : {}),
      ...(c === "KONKUR" || c === "GIFTED" ? { category: c } : {}),
    },
    orderBy: [{ sortOrder: "asc" }],
  });
  return (
    <>
      <PageTitle title="افتخارات" sub={`${fa(items.length)} مورد`} action={<Link href="/admin/achievements/new" className="btn-gold px-5 py-2.5 text-sm">+ افتخار جدید</Link>} />
      <Flash ok={ok} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="جستجوی نام یا مدرسه…" className="input max-w-xs" />
        <select name="c" defaultValue={c} className="input w-auto"><option value="">همه دسته‌ها</option><option value="GIFTED">تیزهوشان و نمونه دولتی</option><option value="KONKUR">کنکور</option></select>
        <button className="btn-ghost px-4 py-2 text-sm">فیلتر</button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-ivory text-right text-xs text-muted"><tr><th className="p-3">دانش‌آموز</th><th className="hidden p-3 md:table-cell">جزئیات</th><th className="p-3">وضعیت</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {items.map((a) => (
              <tr key={a.id} className="hover:bg-ivory/60">
                <td className="p-3"><div className="flex items-center gap-3"><div className="size-11 shrink-0 overflow-hidden rounded-xl bg-ivory">{a.photo && <img src={a.photo} alt="" className="size-full object-cover" />}</div><div><p className="font-bold text-navy">{a.name}</p><p className="text-xs text-muted">{a.category === "KONKUR" ? "کنکور" : "تیزهوشان و نمونه دولتی"} · {a.grade}</p></div></div></td>
                <td className="hidden max-w-xs truncate p-3 text-muted md:table-cell">{a.detail}</td>
                <td className="p-3"><span className={`chip ${a.published ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>{a.published ? "منتشرشده" : "پنهان"}</span>{a.featured && <span className="chip mr-1 bg-gold/20 text-gold-ink">برجسته</span>}</td>
                <td className="p-3 text-left"><Link href={`/admin/achievements/${a.id}`} className="font-bold text-edu">ویرایش</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
