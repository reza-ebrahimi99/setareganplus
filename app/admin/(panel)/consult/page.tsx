import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa, jalaliDateTime, prettyPhone } from "@/lib/format";
import { PageTitle, Empty } from "@/components/admin/ui";
import { AUDIENCE_LABEL, MODE_LABEL, PROOF_LABEL, STATUS_LABEL } from "@/lib/consult/constants";
import { SOURCE_LABEL } from "@/lib/analytics/classify";

export const dynamic = "force-dynamic";

export default async function ConsultList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePerm("consult.view");
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUS_LABEL ? sp.status : "";
  const audience = sp.audience === "PUBLIC" || sp.audience === "SPECIAL" ? sp.audience : "";
  const mode = sp.mode === "ONLINE" || sp.mode === "IN_PERSON" ? sp.mode : "";
  const proof = sp.proof === "SMS" || sp.proof === "ACCESS_CODE" ? sp.proof : "";
  const q = (sp.q ?? "").trim();
  const source = (sp.source ?? "").trim();
  const where = {
    ...(status ? { status } : {}),
    ...(audience ? { audience } : {}),
    ...(mode ? { mode } : {}),
    ...(proof ? { phoneProof: proof } : {}),
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { bookerName: { contains: q } },
            { studentName: { contains: q } },
            { mobile: { contains: q.replace(/\D/g, "") || q } },
            { code: { equals: q.toUpperCase() } },
          ],
        }
      : {}),
  };
  const [rows, consultants, pending] = await Promise.all([
    prisma.consultation.findMany({ where, include: { consultant: { select: { name: true } }, student: { select: { fullName: true } } }, orderBy: { startsAt: "asc" }, take: 200 }),
    prisma.consultant.count(),
    prisma.consultation.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <>
      <PageTitle title="نوبت‌های مشاوره" sub={`${fa(pending)} در انتظار تأیید`} action={<Link href="/admin/consult/consultants" className="btn-ghost px-4 py-2 text-sm">مشاوران و برنامه‌ها</Link>} />
      {consultants === 0 && (
        <p className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-7 text-gold-ink">
          هنوز مشاوری ثبت نشده و هیچ وقتی ساخته نمی‌شود. اول از «مشاوران» یک نفر را با عکس، تخصص و بازهٔ واقعی اضافه کنید. برای جلسهٔ ویژه، دانش‌آموزان را جداگانه با کد وارد کنید.
        </p>
      )}
      <form className="mb-4 grid gap-2 rounded-2xl border border-line bg-paper p-3 sm:grid-cols-3 lg:grid-cols-6">
        <select name="status" defaultValue={status} className="input py-2 text-sm"><option value="">همهٔ وضعیت‌ها</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="audience" defaultValue={audience} className="input py-2 text-sm"><option value="">هر دو صفحه</option><option value="PUBLIC">رایگان عمومی</option><option value="SPECIAL">ویژهٔ دانش‌آموز</option></select>
        <select name="mode" defaultValue={mode} className="input py-2 text-sm"><option value="">آنلاین و حضوری</option><option value="ONLINE">آنلاین</option><option value="IN_PERSON">حضوری</option></select>
        <select name="proof" defaultValue={proof} className="input py-2 text-sm"><option value="">هر نوع تأیید</option><option value="SMS">پیامک</option><option value="ACCESS_CODE">کد دانش‌آموزی</option></select>
        <input name="source" defaultValue={source} placeholder="منبع، مثلاً sms" className="input py-2 text-sm" dir="ltr" />
        <input name="q" defaultValue={q} placeholder="نام، موبایل یا کد" className="input py-2 text-sm" />
        <button className="btn-navy px-4 py-2 text-sm sm:col-span-2">اعمال فیلتر</button>
      </form>
      {rows.length === 0 ? <Empty>نوبتی با این فیلتر نیست.</Empty> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-ivory text-right text-xs text-muted">
              <tr>
                <th className="p-3 font-semibold">زمان</th>
                <th className="p-3 font-semibold">مراجع</th>
                <th className="p-3 font-semibold">مشاور</th>
                <th className="p-3 font-semibold">تأیید</th>
                <th className="p-3 font-semibold">منبع</th>
                <th className="p-3 font-semibold">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ivory/60">
                  <td className="p-3">
                    <Link href={`/admin/consult/${r.id}`} className="font-bold text-navy">{jalaliDateTime(r.startsAt)}</Link>
                    <p className="text-xs text-muted">{AUDIENCE_LABEL[r.audience as keyof typeof AUDIENCE_LABEL] ?? r.audience} · {MODE_LABEL[r.mode as keyof typeof MODE_LABEL] ?? r.mode}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold">{r.studentName}</p>
                    <p className="text-xs text-muted" dir="ltr">{prettyPhone(r.mobile)}</p>
                  </td>
                  <td className="p-3">{r.consultant.name}</td>
                  <td className="p-3 text-xs">{PROOF_LABEL[r.phoneProof as keyof typeof PROOF_LABEL] ?? r.phoneProof}{r.student ? ` · ${r.student.fullName}` : ""}</td>
                  <td className="p-3 text-xs">{r.source ? SOURCE_LABEL[r.source] ?? r.source : "—"}{r.campaign ? ` / ${r.campaign}` : ""}</td>
                  <td className="p-3"><span className={`chip ${r.status === "CANCELLED" ? "bg-line text-muted" : r.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-gold/20 text-gold-ink"}`}>{STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
