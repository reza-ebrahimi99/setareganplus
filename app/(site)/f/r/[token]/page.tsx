import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { qrSvg } from "@/lib/shop/qr";
import { siteUrl } from "@/lib/shop/config";
import { fa, jalaliDateTime, prettyPhone } from "@/lib/format";
import { parseFields } from "@/lib/forms/types";
import { tomanText } from "@/lib/forms/pricing";
import { themeVars } from "@/lib/forms/themes";
import { identity, receiptPath } from "@/lib/forms/registration";
import { submissionRef } from "@/lib/submissions";
import { PrintButton } from "@/components/shop/PrintButton";
import { AutoRedirect } from "@/components/forms/AutoRedirect";
import { retryFormPayment, recheckFormPayment } from "../../actions";

export const metadata: Metadata = { title: "رسید ثبت‌نام", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NOTE: Record<string, string> = {
  failed: "پرداخت انجام نشد یا لغو شد. اگر مبلغی از حساب شما کم شده، طی ۷۲ ساعت برمی‌گردد.",
  pending: "تأیید پرداخت از درگاه هنوز انجام نشده است. چند لحظه بعد «بررسی دوباره» را بزنید.",
  gateway: "اتصال به درگاه پرداخت برقرار نشد. چند دقیقه بعد دوباره تلاش کنید.",
  full: "ظرفیت این ثبت‌نام در این فاصله تکمیل شد و امکان پرداخت نیست.",
  closed: "مهلت این ثبت‌نام تمام شده است.",
  busy: "تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید.",
};

const maskCard = (c?: string | null) => (c ? c.replace(/\D/g, "").replace(/^(\d{6})\d+(\d{4})$/, "$1******$2") : null);

export default async function Receipt({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string }> }) {
  const { token } = await params;
  const { r } = await searchParams;
  const sub = await prisma.submission.findUnique({
    where: { token: decodeURIComponent(token) },
    include: { form: true, payments: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!sub) notFound();
  const f = sub.form;
  const paidPay = sub.payments.find((p) => p.status === "PAID");
  const pendingPay = sub.payments.find((p) => p.status === "PENDING" && p.trackId);
  const done = sub.payState === "PAID" || sub.payState === "NONE";
  const ref = submissionRef(sub.id);
  const who = identity(parseFields(f.fields), sub.data as Record<string, unknown>);
  const lines = (Array.isArray(sub.priceLines) ? sub.priceLines : []) as { label: string; rials: number }[];
  const svg = done ? await qrSvg(`${siteUrl()}${receiptPath(sub.token!)}`) : null;
  const note = r && r !== "paid" ? NOTE[r] : null;
  const redirectTo = done && f.successRedirect ? f.successRedirect : null;

  const status = sub.payState === "PAID"
    ? { t: "پرداخت موفق — ثبت‌نام قطعی شد", c: "bg-emerald-50 text-emerald-800 border-emerald-200", i: "✓" }
    : sub.payState === "NONE"
      ? { t: "ثبت‌نام انجام شد", c: "bg-emerald-50 text-emerald-800 border-emerald-200", i: "✓" }
      : sub.payState === "PENDING"
        ? { t: "در انتظار پرداخت", c: "bg-amber-50 text-amber-900 border-amber-200", i: "⏳" }
        : { t: "پرداخت ناموفق", c: "bg-gc-soft text-gc border-gc/20", i: "!" };

  return (
    <section className="container-x max-w-2xl py-8 sm:py-12" style={themeVars(f.theme)}>
      {done && (
        <div className="mb-6 text-center print:hidden">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-500/30 [animation:pop_.5s_ease-out]">✓</span>
          <h1 className="mt-4 text-2xl font-black text-navy">{f.successTitle || (sub.payState === "PAID" ? "پرداخت موفق بود" : "با موفقیت ثبت شد")}</h1>
          <p className="mx-auto mt-2 max-w-md leading-8 text-muted">{f.successMessage}</p>
        </div>
      )}
      {!done && <h1 className="sr-only">رسید ثبت‌نام</h1>}
      {note && <p className="mb-5 rounded-2xl border border-gc/20 bg-gc-soft px-4 py-3 text-sm leading-7 text-gc print:hidden" data-receipt-note={r}>{note}</p>}

      <article data-receipt={sub.payState} className="overflow-hidden rounded-[1.75rem] bg-paper shadow-[var(--shadow-lift)] ring-1 ring-line print:shadow-none print:ring-black">
        <header className="relative overflow-hidden bg-[linear-gradient(135deg,var(--fh1),var(--fh2))] px-6 py-6 text-white print:bg-none print:text-black">
          <div className="relative flex items-center gap-4">
            {f.logo ? <img src={f.logo} alt="" className="size-12 rounded-xl bg-white object-contain p-1" /> : <span className="flex size-12 items-center justify-center rounded-xl bg-white/15 text-2xl text-gold">★</span>}
            <div className="min-w-0">
              <p className="text-xs text-white/70 print:text-black">رسید ثبت‌نام · ستارگان پلاس</p>
              <p className="truncate text-lg font-black">{f.title}</p>
            </div>
          </div>
        </header>
        <div className={`mx-6 mt-5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${status.c}`}><span aria-hidden>{status.i}</span>{status.t}</div>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div className="col-span-2"><dt className="text-xs text-muted">کد پیگیری</dt><dd className="mt-0.5 font-mono text-2xl font-black tracking-[0.25em] text-navy" dir="ltr" style={{ textAlign: "right" }} data-ref>{ref}</dd></div>
            {who.name && <div><dt className="text-xs text-muted">نام</dt><dd className="font-bold">{who.name}</dd></div>}
            {sub.mobile && <div><dt className="text-xs text-muted">موبایل</dt><dd className="font-bold" dir="ltr" style={{ textAlign: "right" }}>{prettyPhone(sub.mobile)}</dd></div>}
            <div><dt className="text-xs text-muted">تاریخ ثبت</dt><dd className="font-bold">{jalaliDateTime(sub.createdAt)}</dd></div>
            {sub.paidAt && <div><dt className="text-xs text-muted">تاریخ پرداخت</dt><dd className="font-bold">{jalaliDateTime(sub.paidAt)}</dd></div>}
            {paidPay?.refNumber && <div><dt className="text-xs text-muted">شمارهٔ مرجع بانک</dt><dd className="font-mono font-bold" dir="ltr" style={{ textAlign: "right" }}>{fa(paidPay.refNumber)}</dd></div>}
            {paidPay?.cardNumber && <div><dt className="text-xs text-muted">کارت</dt><dd className="font-mono text-xs font-bold" dir="ltr" style={{ textAlign: "right" }}>{maskCard(paidPay.cardNumber)}</dd></div>}
          </dl>
          {svg && (
            <div className="mx-auto text-center">
              <div className="size-36 overflow-hidden rounded-xl border border-line [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
              <p className="mt-1 text-[0.7rem] text-muted">برای ارائه به پذیرش</p>
            </div>
          )}
        </div>

        {(lines.length > 0 || sub.amountRials > 0) && (
          <>
            <div className="relative mx-6 border-t-2 border-dashed border-line" aria-hidden />
            <div className="p-6 text-sm">
              <ul className="space-y-1.5">
                {lines.map((l, i) => <li key={i} className="flex justify-between gap-4"><span className="text-muted">{l.label}</span><span className="font-semibold">{tomanText(l.rials)}</span></li>)}
                {sub.discountRials > 0 && <li className="flex justify-between gap-4 text-emerald-700"><span>تخفیف ({sub.discountCode})</span><span className="font-semibold">− {tomanText(sub.discountRials)}</span></li>}
              </ul>
              <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-base font-black text-navy"><span>{sub.payState === "PAID" ? "مبلغ پرداخت‌شده" : "مبلغ قابل پرداخت"}</span><span data-amount>{tomanText(sub.amountRials)}</span></p>
            </div>
          </>
        )}

        {!done && (
          <div className="flex flex-wrap gap-3 border-t border-line bg-ivory/60 p-6 print:hidden">
            <form action={retryFormPayment}><input type="hidden" name="token" value={sub.token!} /><button className="btn-gold px-6 py-2.5" data-retry>پرداخت دوباره · {tomanText(sub.amountRials)}</button></form>
            {pendingPay && <form action={recheckFormPayment}><input type="hidden" name="token" value={sub.token!} /><button className="btn-ghost px-5 py-2.5">بررسی دوباره</button></form>}
          </div>
        )}
      </article>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
        {done && <PrintButton label="چاپ رسید / ذخیره PDF" />}
        {redirectTo ? <AutoRedirect href={redirectTo} /> : <Link href="/forms" className="btn-ghost">ثبت‌نام‌های دیگر</Link>}
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-muted print:hidden">این صفحه را نگه دارید؛ نشانی آن رسید شماست. {sub.form.smsConfirm && done ? "رسید پیامکی هم برایتان ارسال می‌شود." : ""}</p>
    </section>
  );
}
