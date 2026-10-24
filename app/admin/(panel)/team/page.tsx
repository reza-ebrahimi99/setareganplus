import { requirePerm } from "@/lib/auth";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { PageTitle, Flash } from "@/components/admin/ui";

export default async function TeamList({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("content.team");
  const { ok } = await searchParams;
  const team = await prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageTitle title="تیم" sub={`${fa(team.length)} عضو`} action={<Link href="/admin/team/new" className="btn-gold px-5 py-2.5 text-sm">+ عضو جدید</Link>} />
      <Flash ok={ok} />
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-ivory text-right text-xs text-muted">
            <tr><th className="p-3 font-semibold">عضو</th><th className="hidden p-3 font-semibold md:table-cell">بخش</th><th className="p-3 font-semibold">وضعیت</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {team.map((m) => (
              <tr key={m.id} className="hover:bg-ivory/60">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-ivory">{m.photo && <img src={m.photo} alt="" className="size-full object-cover object-top" />}</div>
                    <div><p className="font-bold text-navy">{m.name}</p><p className="text-xs text-muted">{m.role}</p></div>
                  </div>
                </td>
                <td className="hidden p-3 text-muted md:table-cell">{m.department}</td>
                <td className="p-3">
                  <span className={`chip ${m.published ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>{m.published ? "منتشرشده" : "پنهان"}</span>
                  {m.featured && <span className="chip mr-1 bg-gold/20 text-gold-ink">صفحه اصلی</span>}
                </td>
                <td className="p-3 text-left"><Link href={`/admin/team/${m.id}`} className="font-bold text-edu">ویرایش</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
