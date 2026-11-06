/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa } from "@/lib/format";
import { PageTitle, Flash, Empty } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function Consultants({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("consult.consultants");
  const { ok } = await searchParams;
  const rows = await prisma.consultant.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { windows: true, exceptions: true } } } });
  return (
    <>
      <PageTitle title="مشاوران" sub="تا وقتی بازهٔ هفتگی یا روز اضافه ثبت نشود، این افراد در سایت وقت ندارند." action={<Link href="/admin/consult/consultants/new" className="btn-gold px-5 py-2.5 text-sm">+ مشاور</Link>} />
      <Flash ok={ok} />
      {rows.length === 0 ? (
        <Empty>هنوز مشاوری ساخته نشده. نام، تخصص و برنامه را خودتان وارد کنید؛ سایت کسی را به‌جای شما نمی‌سازد.</Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="bg-ivory text-right text-xs text-muted"><tr><th className="p-3 font-semibold">مشاور</th><th className="p-3 font-semibold">برنامه</th><th className="p-3 font-semibold">وضعیت</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 overflow-hidden rounded-xl bg-ivory">{m.photo && <img src={m.photo} alt="" className="size-full object-cover" />}</div>
                      <div><p className="font-bold text-navy">{m.name}</p><p className="text-xs text-muted">{m.specialty}</p></div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted">{fa(m._count.windows)} بازهٔ هفتگی · {fa(m._count.exceptions)} استثنا</td>
                  <td className="p-3 text-xs">
                    <span className={`chip ${m.active ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>{m.active ? "فعال" : "پنهان"}</span>
                  </td>
                  <td className="p-3 text-left"><Link href={`/admin/consult/consultants/${m.id}`} className="font-bold text-edu">ویرایش</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
