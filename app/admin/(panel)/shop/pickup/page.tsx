import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePerm, logAction, actorName, can } from "@/lib/auth";
import { s, sn } from "@/lib/admin";
import { PageTitle, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ScanInput } from "@/components/admin/shop/ScanInput";
import { findForPickup } from "@/lib/shop/admin";
import { setStage, type StageResult } from "@/lib/shop/orders";
import { STAGE, BRANCH_LABEL, PAY_METHOD, formatToman } from "@/lib/shop/config";
import { fa, jalaliDateTime, prettyPhone } from "@/lib/format";

export const metadata = { title: "تحویل حضوری" };

export default async function Pickup({ searchParams }: { searchParams: Promise<{ q?: string; done?: string; err?: string }> }) {
  const viewer = await requirePerm("shop.pickup");
  const { q, done, err } = await searchParams;
  const found = q ? await findForPickup(q) : [];

  async function deliver(fd: FormData) {
    "use server";
    const me = await requirePerm("shop.pickup");
    const id = s(fd, "id");
    const back = `/admin/shop/pickup?q=${encodeURIComponent(s(fd, "q") || "")}`;
    let r: StageResult | null = null;
    try {
      r = await setStage([id], "DELIVERED", { deliveredTo: sn(fd, "deliveredTo"), payMethod: sn(fd, "payMethod") ?? undefined, actor: actorName(me) });
      if (r.changed) await logAction(me, "order.pickup", `تحویل حضوری به ${s(fd, "name")}${sn(fd, "deliveredTo") ? ` (تحویل‌گیرنده: ${s(fd, "deliveredTo")})` : ""}`, id);
    } catch (e) {
      console.error("[admin] pickup failed", id, e);
    }
    if (!r || r.failed) redirect(`${back}&err=server`);
    redirect(`/admin/shop/pickup?done=${encodeURIComponent(s(fd, "name"))}`);
  }

  return (
    <>
      <PageTitle title="تحویل حضوری جزوه" sub="کد روی رسید خریدار را اسکن یا وارد کنید، سپس «تحویل داده شد» را بزنید." />
      {done && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800"><p className="text-lg font-extrabold">✓ تحویل ثبت شد</p><p className="text-sm">جزوهٔ {done} تحویل داده شد. سفارش بعدی را اسکن کنید.</p></div>}
      {err && <div role="alert" className="mb-5 rounded-2xl border border-gc/30 bg-gc-soft px-5 py-4 font-semibold text-gc">خطا: تحویل ثبت نشد. چند لحظه بعد دوباره «تحویل داده شد» را بزنید؛ اگر باز هم نشد به مدیر خبر دهید.</div>}
      <Panel>
        <form><ScanInput defaultValue={done ? "" : q} /></form>
      </Panel>

      {q && !done && found.length === 0 && <div className="mt-5 rounded-2xl border border-gc/30 bg-gc-soft px-5 py-4 font-semibold text-gc">سفارشی با «{q}» پیدا نشد.</div>}

      <div className="mt-5 space-y-4">
        {found.map((o) => {
          const delivered = o.stage === "DELIVERED";
          const cancelled = o.stage === "CANCELLED";
          const unpaid = o.payStatus !== "PAID";
          return (
            <Panel key={o.id} className={delivered ? "opacity-80" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-extrabold text-navy">{o.buyerName}</p>
                  <p className="text-sm text-muted"><span dir="ltr">{prettyPhone(o.mobile)}</span> · {[o.grade, o.major].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${STAGE[o.stage].cls}`}>{STAGE[o.stage].label}</span>
              </div>
              <div className="mt-4 grid gap-3 rounded-xl bg-ivory p-4 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted">جزوه</p><p className="font-bold">{o.items.map((i) => i.title + (i.qty > 1 ? ` × ${fa(i.qty)}` : "")).join("، ")}</p></div>
                <div><p className="text-xs text-muted">شعبه</p><p className="font-bold">{BRANCH_LABEL[o.branch] ?? o.branch}</p></div>
                <div><p className="text-xs text-muted">کد / مبلغ</p><p className="font-bold"><span dir="ltr" className="font-mono">{o.shortCode}</span> · {formatToman(o.totalRials)}</p></div>
              </div>
              {delivered ? (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">قبلاً تحویل داده شده{o.deliveredAt && ` — ${jalaliDateTime(o.deliveredAt)}`}{o.deliveredTo && ` به ${o.deliveredTo}`}.</p>
              ) : cancelled ? (
                <p className="mt-4 rounded-xl bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">این سفارش لغو شده است.</p>
              ) : (
                <form action={deliver} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="name" value={o.buyerName} />
                  <input type="hidden" name="q" value={q ?? ""} />
                  {unpaid && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
                      این سفارش <b>پرداخت نشده</b> است. مبلغ {formatToman(o.totalRials)} را دریافت کنید:
                      <select name="payMethod" defaultValue="CASH" className="input mt-2">{Object.entries(PAY_METHOD).filter(([k]) => k !== "ONLINE").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    </div>
                  )}
                  {!unpaid && o.stage !== "READY" && <p className="text-xs text-amber-800 sm:col-span-2">توجه: وضعیت این سفارش هنوز «آماده تحویل» نیست.</p>}
                  <input name="deliveredTo" defaultValue={o.buyerName} placeholder="نام تحویل‌گیرنده" className="input" />
                  <SubmitButton className="btn-gold px-8 py-3">تحویل داده شد ✓</SubmitButton>
                </form>
              )}
              {can(viewer, "shop.orders.view") && <Link href={`/admin/shop/orders/${o.id}`} className="mt-3 inline-block text-xs font-semibold text-muted hover:text-navy">جزئیات سفارش ←</Link>}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
