import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa } from "@/lib/format";
import { PageTitle, Flash } from "@/components/admin/ui";
import { formatToman } from "@/lib/shop/config";
import { syncBankNow } from "./actions";

export default async function AdminClasses({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string; synced?: string }> }) {
  await requirePerm("classes.manage");
  const sp = await searchParams;
  const [courses, sync] = await Promise.all([
    prisma.classCourse.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { lessons: true, enrollments: true } } } }),
    prisma.bankSync.findUnique({ where: { id: "main" } }).catch(() => null),
  ]);
  const bankCount = await prisma.bankQuestion.count({ where: { active: true } }).catch(() => 0);
  return (
    <>
      <PageTitle title="کلاس‌های ویدیویی" sub="دوره‌ها، قیمت، جلسه و مسیر یادگیری" action={<Link href="/admin/classes/new" className="btn-navy px-4 py-2 text-sm">دورهٔ جدید</Link>} />
      <Flash ok={sp.ok} />
      {sp.e && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{sp.e}</p>}
      {sp.synced != null && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">این دور {sp.synced} سؤال تازه ذخیره شد. اگر هنوز سؤال مانده، دوباره بزنید یا دستور سرور را اجرا کنید.</p>}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/classes/report" className="btn-ghost px-3 py-1.5">گزارش تماشا</Link>
        <Link href="/admin/classes/threads" className="btn-ghost px-3 py-1.5">پرسش‌ها</Link>
        <Link href="/admin/classes/paths" className="btn-ghost px-3 py-1.5">مسیرها</Link>
        <Link href="/admin/classes/import" className="btn-ghost px-3 py-1.5">ورود دستی سؤال</Link>
        <form action={syncBankNow}><button className="btn-navy px-3 py-1.5">همگام‌سازی بانک سؤال</button></form>
        <span className="text-xs text-muted">{bankCount.toLocaleString("fa-IR")} سؤال فعال{sync ? ` · تا شناسه ${sync.sinceId}` : ""}</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="text-muted"><tr><th className="p-3 text-right">دوره</th><th>جلسه</th><th>دانش‌آموز</th><th>قیمت</th></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3"><Link href={`/admin/classes/${c.id}`} className="font-bold text-navy">{c.title}</Link><span className="mr-2 text-xs text-muted">{c.published ? "" : "پنهان"}</span></td>
                <td className="p-3 text-center">{fa(c._count.lessons)}</td>
                <td className="p-3 text-center">{fa(c._count.enrollments)}</td>
                <td className="p-3">{c.isFree ? "رایگان" : formatToman(c.salePriceRials && c.salePriceRials < c.priceRials ? c.salePriceRials : c.priceRials)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
