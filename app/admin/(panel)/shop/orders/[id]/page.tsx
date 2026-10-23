import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s, sn } from "@/lib/admin";
import { PageTitle, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { STAGE, STAGES, BRANCHES, BRANCH_LABEL, PAY_METHOD, formatToman, GRADES, MAJORS } from "@/lib/shop/config";
import { setStage, verifyPayment, notifyReady, ticketPath } from "@/lib/shop/orders";
import { qrSvg, ticketUrl } from "@/lib/shop/qr";
import type { OrderStage } from "@/generated/prisma/client";
import { fa, jalaliDateTime, prettyPhone, telHref } from "@/lib/format";

const PAY_ST: Record<string, string> = { PENDING: "در انتظار", PAID: "موفق", FAILED: "ناموفق", UNPAID: "—", REFUNDED: "مسترد" };
const SMS_KIND: Record<string, string> = { purchase: "خرید", ready: "آماده‌بودن", admin: "مدیر" };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; v?: string }> }) {
  const { id } = await params;
  const { ok, v } = await searchParams;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { slug: true } } } }, events: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } } } });
  if (!o) notFound();
  const sms = await prisma.smsLog.findMany({ where: { orderId: id }, orderBy: { createdAt: "desc" }, take: 20 });
  const svg = await qrSvg(ticketUrl(o.qrToken));
  const here = `/admin/shop/orders/${id}`;

  async function changeStage(fd: FormData) {
    "use server";
    await requireAdmin();
    const stage = s(fd, "stage") as OrderStage;
    await setStage([id], stage, { deliveredTo: sn(fd, "deliveredTo"), payMethod: sn(fd, "payMethod") ?? undefined });
    redirect(`${here}?ok=1`);
  }
  async function saveInfo(fd: FormData) {
    "use server";
    await requireAdmin();
    const note = sn(fd, "adminNote");
    const cur = await prisma.order.findUnique({ where: { id }, select: { adminNote: true } });
    await prisma.order.update({
      where: { id },
      data: { adminNote: note, buyerName: s(fd, "buyerName") || undefined, branch: s(fd, "branch") || undefined, grade: sn(fd, "grade"), major: sn(fd, "major"), parentName: sn(fd, "parentName") },
    });
    if ((cur?.adminNote ?? null) !== note && note) await prisma.orderEvent.create({ data: { orderId: id, type: "NOTE", text: `یادداشت: ${note.slice(0, 300)}` } });
    redirect(`${here}?ok=1`);
  }
  async function recheck(fd: FormData) {
    "use server";
    await requireAdmin();
    const r = await verifyPayment(s(fd, "pid"));
    redirect(`${here}?v=${r.kind}`);
  }
  async function resendReady() {
    "use server";
    await requireAdmin();
    await notifyReady(id);
    redirect(`${here}?ok=1`);
  }

  const idx = (STAGES as readonly string[]).indexOf(o.stage);
  return (
    <>
      <PageTitle
        title={o.buyerName}
        sub={`سفارش ${fa(o.number)} · ثبت ${jalaliDateTime(o.createdAt)}${o.source === "legacy" ? " · منتقل‌شده از سایت قبلی" : o.source === "admin" ? " · ثبت دستی" : ""}`}
        action={<div className="flex gap-2"><Link href={ticketPath(o.qrToken)} target="_blank" className="btn-ghost px-4 py-2 text-sm">رسید خریدار ↗</Link><Link href={`/admin/labels?ids=${o.id}`} target="_blank" className="btn-ghost px-4 py-2 text-sm">چاپ برچسب</Link></div>}
      />
      {ok && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">✓ ذخیره شد.</div>}
      {v && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${v === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>نتیجهٔ استعلام از زیبال: {v === "paid" ? "پرداخت تأیید شد ✓" : v === "failed" ? "پرداخت انجام نشده است." : "پاسخ قطعی دریافت نشد؛ بعداً دوباره امتحان کنید."}</div>}

      <Panel className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {STAGES.map((st, i) => (
            <div key={st} className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${o.stage === "CANCELLED" ? "bg-line text-muted" : i <= idx ? STAGE[st].cls : "bg-ivory text-muted"}`}><span className={`size-1.5 rounded-full ${i <= idx && o.stage !== "CANCELLED" ? STAGE[st].dot : "bg-line"}`} />{STAGE[st].short}</span>
              {i < STAGES.length - 1 && <span className="text-line">—</span>}
            </div>
          ))}
          {o.stage === "CANCELLED" && <span className={`rounded-full px-3 py-1 text-xs font-bold ${STAGE.CANCELLED.cls}`}>لغوشده</span>}
        </div>
        <form action={changeStage} className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select name="stage" defaultValue={idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : o.stage} className="input">{[...STAGES, "CANCELLED" as const].map((st) => <option key={st} value={st}>{STAGE[st].label}</option>)}</select>
          <input name="deliveredTo" placeholder="تحویل‌گیرنده (برای تحویل)" className="input" />
          <select name="payMethod" defaultValue="" className="input" disabled={o.payStatus === "PAID"}><option value="">{o.payStatus === "PAID" ? `پرداخت: ${PAY_METHOD[o.payMethod] ?? o.payMethod}` : "روش پرداخت حضوری…"}</option>{Object.entries(PAY_METHOD).filter(([k]) => k !== "ONLINE").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <SubmitButton className="btn-gold px-5 py-2 text-sm">ثبت وضعیت</SubmitButton>
        </form>
        {o.payStatus !== "PAID" && <p className="mt-2 text-xs text-muted">این سفارش هنوز پرداخت نشده؛ اگر وضعیت را جلو ببرید، پرداخت حضوری (پیش‌فرض: نقدی) ثبت می‌شود.</p>}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="اقلام">
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2.5 text-sm">
                  <span>{i.product ? <Link href={`/shop/${i.product.slug}`} target="_blank" className="font-semibold text-navy hover:underline">{i.title}</Link> : <span className="font-semibold">{i.title}</span>}{i.qty > 1 && <span className="text-muted"> × {fa(i.qty)}</span>}</span>
                  <span className="font-semibold">{formatToman(i.totalRials)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 font-extrabold text-navy"><span>جمع</span><span>{formatToman(o.totalRials)}</span></li>
            </ul>
            {o.customerNote && <p className="mt-3 rounded-xl bg-ivory p-3 text-sm"><b>توضیح خریدار:</b> {o.customerNote}</p>}
          </Panel>

          <Panel title="اطلاعات و یادداشت">
            <form action={saveInfo} className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">نام خریدار</span><input name="buyerName" defaultValue={o.buyerName} className="input" /></label>
              <label className="block"><span className="label">شعبهٔ تحویل</span><select name="branch" defaultValue={o.branch} className="input">{Object.entries(BRANCHES).map(([k, b]) => <option key={k} value={k}>{b.short}</option>)}{!(o.branch in BRANCHES) && <option value={o.branch}>{BRANCH_LABEL[o.branch] ?? o.branch}</option>}</select></label>
              <label className="block"><span className="label">پایه</span><select name="grade" defaultValue={o.grade ?? ""} className="input"><option value="">—</option>{GRADES.map((g) => <option key={g}>{g}</option>)}{o.grade && !(GRADES as readonly string[]).includes(o.grade) && <option>{o.grade}</option>}</select></label>
              <label className="block"><span className="label">رشته</span><select name="major" defaultValue={o.major ?? ""} className="input"><option value="">—</option>{MAJORS.map((g) => <option key={g}>{g}</option>)}{o.major && !(MAJORS as readonly string[]).includes(o.major) && <option>{o.major}</option>}</select></label>
              <label className="block sm:col-span-2"><span className="label">نام ولی</span><input name="parentName" defaultValue={o.parentName ?? ""} className="input" /></label>
              <label className="block sm:col-span-2"><span className="label">یادداشت داخلی (فقط برای همکاران)</span><textarea name="adminNote" defaultValue={o.adminNote ?? ""} rows={3} className="input leading-7" /></label>
              <div className="sm:col-span-2"><SubmitButton className="btn-ghost px-5 py-2 text-sm">ذخیره اطلاعات</SubmitButton></div>
            </form>
          </Panel>

          <Panel title="تاریخچه">
            <ol className="relative space-y-4 border-r-2 border-line pr-5">
              {o.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -right-[27px] top-1.5 size-3 rounded-full border-2 border-paper ${e.stage ? STAGE[e.stage].dot : e.type === "PAYMENT" ? "bg-gold" : "bg-muted"}`} />
                  <p className="text-sm">{e.text}</p>
                  <p className="text-xs text-muted">{jalaliDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="خریدار">
            <dl className="space-y-2.5 text-sm">
              <Row k="موبایل"><a href={telHref(o.mobile)} className="font-semibold text-navy" dir="ltr">{prettyPhone(o.mobile)}</a></Row>
              {o.nationalCode && <Row k="کد ملی">{fa(o.nationalCode)}</Row>}
              <Row k="پایه / رشته">{[o.grade, o.major].filter(Boolean).join(" · ") || "—"}</Row>
              <Row k="شعبه">{BRANCH_LABEL[o.branch] ?? o.branch}</Row>
              <Row k="کد تحویل"><span className="font-mono text-base font-bold tracking-widest" dir="ltr">{o.shortCode}</span></Row>
              {o.deliveredTo && <Row k="تحویل‌گیرنده">{o.deliveredTo}</Row>}
            </dl>
            <div className="mx-auto mt-4 w-36 rounded-xl border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          </Panel>

          <Panel title="پرداخت">
            <p className="mb-3 text-sm">وضعیت: <b>{o.payStatus === "PAID" ? `پرداخت‌شده (${PAY_METHOD[o.payMethod] ?? o.payMethod})` : "پرداخت نشده"}</b>{o.paidAt && <span className="text-muted"> · {jalaliDateTime(o.paidAt)}</span>}</p>
            {o.payments.length === 0 ? <p className="text-xs text-muted">تلاشی برای پرداخت آنلاین ثبت نشده.</p> : (
              <ul className="space-y-2">
                {o.payments.map((p) => (
                  <li key={p.id} className="rounded-xl bg-ivory p-3 text-xs">
                    <div className="flex justify-between"><b>{PAY_ST[p.status] ?? p.status}</b><span>{formatToman(p.amountRials)}</span></div>
                    <div className="mt-1 text-muted">{jalaliDateTime(p.createdAt)}{p.trackId && <> · شناسه <span dir="ltr">{p.trackId.replace(/^legacy-/, "")}</span></>}{p.refNumber && <> · پیگیری {fa(p.refNumber)}</>}</div>
                    {p.message && <div className="mt-1 text-amber-800">{p.message}</div>}
                    {p.status !== "PAID" && p.trackId && !p.legacyId && (
                      <form action={recheck} className="mt-2"><input type="hidden" name="pid" value={p.id} /><SubmitButton className="text-xs font-bold text-navy underline">استعلام دوباره از زیبال</SubmitButton></form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="پیامک‌ها">
            {sms.length === 0 ? <p className="text-xs text-muted">پیامکی ثبت نشده.</p> : (
              <ul className="space-y-1.5 text-xs">
                {sms.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2"><span>{SMS_KIND[m.kind] ?? m.kind} → <span dir="ltr">{fa(m.mobile)}</span></span><span className={m.status === "SENT" ? "text-emerald-700" : m.status === "FAILED" ? "text-gc" : "text-muted"} title={m.detail ?? ""}>{m.status === "SENT" ? "ارسال شد" : m.status === "FAILED" ? "خطا" : "ارسال نشد"}</span></li>
                ))}
              </ul>
            )}
            {o.stage === "READY" && <form action={resendReady} className="mt-3"><SubmitButton className="btn-ghost px-4 py-1.5 text-xs">ارسال دوبارهٔ پیامک «آماده تحویل»</SubmitButton></form>}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-left">{children}</dd></div>;
}
