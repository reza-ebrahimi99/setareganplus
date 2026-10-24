import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { redirect } from "next/navigation";
import { querySubmissions, columnsFor, submissionRef, type SubFilters } from "@/lib/submissions";
import { displayValue } from "@/lib/forms/validate";
import { fa, jalaliDateTime, prettyPhone, telHref } from "@/lib/format";
import { STATUS } from "@/components/admin/ui";
import { PageTitle, Empty } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { SubmitButton } from "@/components/admin/SubmitButton";

const PER = 30;

async function setStatus(id: string, status: string) {
  "use server";
  await requirePerm("submissions");
  if (!["NEW", "CONTACTED", "ENROLLED", "ARCHIVED"].includes(status)) return;
  await prisma.submission.update({ where: { id }, data: { status: status as "NEW" } });
  revalidatePath("/admin", "layout");
}
async function saveNote(fd: FormData) {
  "use server";
  await requirePerm("submissions");
  await prisma.submission.update({ where: { id: String(fd.get("id")) }, data: { note: String(fd.get("note") ?? "").trim() || null } });
  revalidatePath("/admin/submissions");
}

async function bulkStatus(fd: FormData) {
  "use server";
  await requirePerm("submissions");
  const status = String(fd.get("status") ?? "");
  const ids = fd.getAll("ids").map(String);
  if (ids.length && ["NEW", "CONTACTED", "ENROLLED", "ARCHIVED"].includes(status)) await prisma.submission.updateMany({ where: { id: { in: ids } }, data: { status: status as "NEW" } });
  revalidatePath("/admin", "layout");
  redirect(String(fd.get("back") || "/admin/submissions"));
}

function cell(v: unknown) {
  if (typeof v === "string" && /^09\d{9}$/.test(v)) return <a href={telHref(v)} dir="ltr" className="font-semibold text-navy hover:text-edu">{prettyPhone(v)}</a>;
  if (v && typeof v === "object" && !Array.isArray(v) && "key" in (v as object)) {
    const f = v as { key: string; name: string };
    return <a href={`/admin/files/${f.key}`} target="_blank" className="font-semibold text-edu underline">{f.name || "فایل"}</a>;
  }
  return displayValue(v);
}

export default async function Submissions({ searchParams }: { searchParams: Promise<SubFilters> }) {
  await requirePerm("submissions");
  const f = await searchParams;
  const page = Math.max(1, Number(f.page) || 1);
  const [forms, { items, total }, selected, byStatus] = await Promise.all([
    prisma.form.findMany({ select: { id: true, title: true, _count: { select: { submissions: { where: { status: "NEW" } } } } }, orderBy: { createdAt: "asc" } }),
    querySubmissions(f, PER, (page - 1) * PER),
    f.form ? prisma.form.findUnique({ where: { id: f.form } }) : null,
    prisma.submission.groupBy({ by: ["status"], where: f.form ? { formId: f.form } : {}, _count: true }),
  ]);
  const sc = Object.fromEntries(byStatus.map((x) => [x.status, x._count])) as Record<string, number>;
  const cols = columnsFor(items, selected?.fields).slice(0, selected ? 6 : 3);
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.fromEntries(Object.entries({ ...f, ...extra }).filter(([, v]) => v))).toString();
  const pages = Math.ceil(total / PER);

  return (
    <>
      <PageTitle
        title={selected ? `پاسخ‌های «${selected.title}»` : "درخواست‌ها"}
        sub={`${fa(total)} مورد`}
        action={
          <div className="flex gap-2">
            <a href={`/admin/export?${qs({ format: "xlsx" })}`} className="btn-ghost px-4 py-2 text-sm">خروجی Excel</a>
            <a href={`/admin/export?${qs({ format: "csv" })}`} className="btn-ghost px-4 py-2 text-sm">CSV</a>
          </div>
        }
      />
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {[{ k: "", l: "همه (به‌جز بایگانی)", n: (sc.NEW ?? 0) + (sc.CONTACTED ?? 0) + (sc.ENROLLED ?? 0) }, ...Object.entries(STATUS).map(([k, v]) => ({ k, l: v.label, n: sc[k] ?? 0 }))].map((t) => (
          <Link key={t.k} href={`?${qs({ status: t.k, page: "" })}`} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${(f.status ?? "") === t.k ? "border-navy bg-navy text-white" : "border-line bg-paper hover:border-navy/30"}`}>
            {t.l} <span className="opacity-70">{fa(t.n)}</span>
          </Link>
        ))}
      </div>
      {!selected && forms.some((x) => x._count.submissions > 0) && (
        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          <span className="py-1 text-muted">جدید در فرم‌ها:</span>
          {forms.filter((x) => x._count.submissions > 0).map((x) => (
            <Link key={x.id} href={`?${qs({ form: x.id, status: "NEW", page: "" })}`} className="rounded-full bg-gold/15 px-2.5 py-1 font-semibold text-gold-ink hover:bg-gold/25">{x.title} · {fa(x._count.submissions)}</Link>
          ))}
        </div>
      )}
      <form className="mb-5 grid gap-2 rounded-2xl border border-line bg-paper p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={f.q} placeholder="جستجوی نام، موبایل، کد ملی یا کد پیگیری" className="input py-2" />
        <select name="form" defaultValue={f.form ?? ""} className="input py-2"><option value="">همه فرم‌ها</option>{forms.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        <select name="status" defaultValue={f.status ?? ""} className="input py-2">
          <option value="">همه (به‌جز بایگانی)</option><option value="NEW">جدید</option><option value="CONTACTED">تماس گرفته شد</option><option value="ENROLLED">ثبت‌نام شد</option><option value="ARCHIVED">بایگانی</option>
        </select>
        <select name="period" defaultValue={f.period ?? ""} className="input py-2"><option value="">همه زمان‌ها</option><option value="today">۲۴ ساعت اخیر</option><option value="7">۷ روز اخیر</option><option value="30">۳۰ روز اخیر</option><option value="90">۹۰ روز اخیر</option></select>
        <button className="btn-gold px-5 py-2 text-sm">اعمال</button>
      </form>

      {items.length === 0 ? (
        <Empty>موردی با این فیلترها پیدا نشد.</Empty>
      ) : (
        <>
        <form id="bulk" action={bulkStatus} className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-2.5">
          <input type="hidden" name="back" value={`/admin/submissions?${qs({})}`} />
          <span className="px-1 text-sm text-muted">موارد تیک‌خورده:</span>
          <select name="status" defaultValue="CONTACTED" className="input w-auto py-1.5 text-sm">{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <SubmitButton className="btn-gold px-4 py-1.5 text-sm">تغییر وضعیت</SubmitButton>
        </form>
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ivory text-right text-xs text-muted">
              <tr>
                <th className="w-8 p-3" />
                <th className="p-3 font-semibold">تاریخ</th>
                {!selected && <th className="p-3 font-semibold">فرم</th>}
                {cols.map((c) => <th key={c.id} className="max-w-48 p-3 font-semibold">{c.label}</th>)}
                <th className="p-3 font-semibold">وضعیت</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((it) => {
                const d = it.data as Record<string, unknown>;
                const all = columnsFor([it]);
                return (
                  <tr key={it.id} className={`align-top ${it.status === "NEW" ? "bg-gold/[0.04]" : ""}`}>
                    <td className="p-3"><input type="checkbox" form="bulk" name="ids" value={it.id} className="size-4 accent-navy" aria-label="انتخاب" /></td>
                    <td className="p-3 text-xs whitespace-nowrap text-muted">{jalaliDateTime(it.createdAt)}<div className="font-mono text-[0.7rem] tracking-wider" dir="ltr" style={{ textAlign: "right" }}>{submissionRef(it.id)}</div></td>
                    {!selected && <td className="p-3 text-xs">{it.form.title}</td>}
                    {cols.map((c) => <td key={c.id} className="max-w-56 p-3" dir={/^\d+$/.test(String(d[c.id] ?? "")) ? "ltr" : undefined}><span className="line-clamp-2">{cell(d[c.id])}</span></td>)}
                    <td className="p-3"><StatusSelect id={it.id} value={it.status} action={setStatus} /></td>
                    <td className="relative p-3">
                      <details className="group">
                        <summary className="cursor-pointer list-none text-xs font-bold text-edu">جزئیات</summary>
                        <div className="fixed inset-x-3 bottom-3 z-30 max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-paper p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-4 sm:mt-2 sm:w-[28rem]">
                          <p className="mb-3 flex items-center justify-between text-xs text-muted"><span>{it.form.title}</span><span className="font-mono" dir="ltr">#{submissionRef(it.id)}</span></p>
                          <dl className="space-y-2 text-sm">
                            {all.map((c) => (
                              <div key={c.id}><dt className="text-xs text-muted">{c.label}</dt><dd className="font-semibold">{cell(d[c.id]) || "—"}</dd></div>
                            ))}
                          </dl>
                          <form action={saveNote} className="mt-3 space-y-2">
                            <input type="hidden" name="id" value={it.id} />
                            <textarea name="note" defaultValue={it.note ?? ""} rows={2} placeholder="یادداشت داخلی…" className="input text-sm" />
                            <SubmitButton className="btn-ghost px-4 py-1.5 text-xs">ذخیره یادداشت</SubmitButton>
                          </form>
                        </div>
                      </details>
                      {it.note && <p className="mt-1 max-w-32 truncate text-[0.7rem] text-muted" title={it.note}>📝 {it.note}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={`?${qs({ page: String(page - 1) })}`} className="btn-ghost px-4 py-1.5">قبلی</Link>}
          <span className="text-muted">صفحه {fa(page)} از {fa(pages)}</span>
          {page < pages && <Link href={`?${qs({ page: String(page + 1) })}`} className="btn-ghost px-4 py-1.5">بعدی</Link>}
        </div>
      )}
    </>
  );
}
