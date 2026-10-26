import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm, logAction, actorName, can } from "@/lib/auth";
import { PageTitle, Empty } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { SelectAll, SelectedCount } from "@/components/admin/shop/SelectAll";
import { STAGE, STAGES, BRANCH_LABEL, BRANCHES, formatToman, formatNum, PAY_METHOD } from "@/lib/shop/config";
import { queryOrders, nextStage, RANGES, type OrderQuery } from "@/lib/shop/admin";
import { setStage } from "@/lib/shop/orders";
import { isStage, stageNotice, stageQuery } from "@/lib/shop/stage-notice";
import { Notices } from "@/components/admin/shop/Notices";
import { StageButton } from "@/components/admin/shop/StageButton";
import type { OrderStage } from "@/generated/prisma/client";
import { fa, jalaliDateTime, prettyPhone } from "@/lib/format";

export const metadata: Metadata = { title: "سفارش‌های جزوه" };

type NoticeParams = { ok?: string; st?: string; same?: string; fail?: string; who?: string; err?: string; t?: string };

const qs = (sp: OrderQuery, extra: Record<string, string | undefined> = {}) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) u.set(k, v);
  return u.toString();
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderQuery & NoticeParams> }) {
  const viewer = await requirePerm("shop.orders.view");
  const canEdit = can(viewer, "shop.orders.edit");
  const canLabels = can(viewer, "shop.labels");
  const { ok, st, same, fail, who, err, t: stamp, ...sp } = await searchParams;
  const notices = stageNotice({ ok, st, same, fail, who, err });
  const [{ items, total, page, pages }, products, counts] = await Promise.all([
    queryOrders(sp),
    prisma.product.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.order.groupBy({ by: ["stage"], where: { OR: [{ payStatus: "PAID" }, { stage: { not: "REGISTERED" } }] }, _count: true }),
  ]);
  const cnt = Object.fromEntries(counts.map((c) => [c.stage, c._count])) as Record<string, number>;
  const back = `/admin/shop/orders?${qs(sp)}`;

  async function bulk(fd: FormData) {
    "use server";
    const me = await requirePerm("shop.orders.edit");
    const one = String(fd.get("one") ?? "");
    let ids = fd.getAll("ids").map(String).filter(Boolean);
    let stage = String(fd.get("stage") ?? "");
    if (one) {
      const [id, st] = one.split(":");
      ids = [id];
      stage = st ?? "";
    }
    const ret = String(fd.get("back") || "/admin/shop/orders");
    const sep = ret.endsWith("?") ? "" : ret.includes("?") ? "&" : "?";
    const err = !ids.length ? "nosel" : !stage ? "nostage" : !isStage(stage) ? "stage" : null;
    if (err) redirect(`${ret}${sep}err=${err}`);
    let q: string;
    try {
      const r = await setStage(ids, stage as OrderStage, { actor: actorName(me) });
      if (r.changed) await logAction(me, "order.stage", `تغییر وضعیت ${r.changed} سفارش به «${STAGE[stage as OrderStage]?.label ?? stage}»`, ids.length === 1 ? ids[0] : null);
      const who = ids.length === 1 ? (await prisma.order.findUnique({ where: { id: ids[0] }, select: { buyerName: true } }).catch(() => null))?.buyerName : null;
      q = stageQuery(r, stage, who);
    } catch (e) {
      console.error("[admin] bulk stage failed", e);
      q = "err=server";
    }
    redirect(`${ret}${sep}${q}`);
  }
  async function labels(fd: FormData) {
    "use server";
    await requirePerm("shop.labels");
    const ids = fd.getAll("ids").map(String);
    redirect(ids.length ? `/admin/labels?ids=${ids.join(",")}` : String(fd.get("back") || "/admin/shop/orders"));
  }

  const tabs: { key?: string; label: string; n?: number }[] = [
    { key: undefined, label: "همه (پرداخت‌شده)" },
    { key: "todo", label: "کارهای مانده", n: (cnt.PAID ?? 0) + (cnt.IN_PRODUCTION ?? 0) },
    ...(["PAID", "IN_PRODUCTION", "READY", "DELIVERED", "REGISTERED", "CANCELLED"] as const).map((s) => ({ key: s, label: STAGE[s].short, n: cnt[s] })),
  ];

  return (
    <>
      <PageTitle
        title="سفارش‌های جزوه"
        sub={`${formatNum(total)} سفارش`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/admin/shop/orders/export?${qs(sp, { format: "xlsx" })}`} className="btn-ghost px-4 py-2 text-sm">خروجی اکسل</a>
            <a href={`/admin/shop/orders/export?${qs(sp, { format: "csv" })}`} className="btn-ghost px-4 py-2 text-sm">CSV</a>
            {canEdit && <Link href="/admin/shop/orders/new" className="btn-gold px-5 py-2 text-sm">+ سفارش دستی</Link>}
          </div>
        }
      />
      <Notices items={notices} stamp={stamp} />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <Link key={t.label} href={`/admin/shop/orders?${qs({ ...sp, stage: t.key, page: undefined })}`} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${sp.stage === t.key ? "border-navy bg-navy text-white" : "border-line bg-paper hover:border-navy/30"}`}>
            {t.label}{t.n ? <span className="mr-1.5 opacity-70">{fa(t.n)}</span> : null}
          </Link>
        ))}
      </div>

      <form className="mb-4 grid gap-2 rounded-2xl border border-line bg-paper p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr_auto]">
        {sp.stage && <input type="hidden" name="stage" value={sp.stage} />}
        <input name="q" defaultValue={sp.q} placeholder="جستجو: نام، موبایل، کد ملی، شماره یا کد سفارش" className="input" />
        <select name="branch" defaultValue={sp.branch ?? ""} className="input"><option value="">همهٔ شعبه‌ها</option>{Object.entries(BRANCHES).map(([k, v]) => <option key={k} value={k}>{v.short}</option>)}<option value="ELEMENTARY">{BRANCH_LABEL.ELEMENTARY}</option></select>
        <select name="range" defaultValue={sp.range ?? ""} className="input"><option value="">همهٔ تاریخ‌ها</option>{Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select name="product" defaultValue={sp.product ?? ""} className="input"><option value="">همهٔ جزوه‌ها</option>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <button className="btn-gold px-5 py-2 text-sm">فیلتر</button>
      </form>

      {items.length === 0 ? <Empty>سفارشی با این شرایط پیدا نشد.</Empty> : (
        <form action={bulk}>
          <input type="hidden" name="back" value={back} />
          <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper/95 p-2.5 backdrop-blur">
            <label className="flex items-center gap-2 px-1"><SelectAll /><SelectedCount /></label>
            <span className="mr-auto" />
            {canEdit && <><select name="stage" defaultValue="" className="input w-auto py-1.5 text-sm"><option value="">تغییر وضعیت به…</option>{[...STAGES, "CANCELLED" as const].map((s) => <option key={s} value={s}>{STAGE[s].label}</option>)}</select>
            <SubmitButton className="btn-gold px-4 py-1.5 text-sm">اعمال</SubmitButton></>}
            {canLabels && <button formAction={labels} className="btn-ghost px-4 py-1.5 text-sm">چاپ برچسب</button>}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-ivory text-xs text-muted">
                <tr><th className="w-10 p-3" /><th className="p-3 text-right">خریدار</th><th className="p-3 text-right">جزوه</th><th className="p-3 text-right">شعبه</th><th className="p-3 text-right">مبلغ</th><th className="p-3 text-right">وضعیت</th><th className="p-3 text-right">تاریخ</th><th className="hidden p-3 lg:table-cell" /></tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const nx = nextStage(o.stage);
                  return (
                    <tr key={o.id} className="border-t border-line align-top hover:bg-ivory/60">
                      <td className="p-3"><input type="checkbox" name="ids" value={o.id} className="size-4 accent-navy" /></td>
                      <td className="p-3">
                        <Link href={`/admin/shop/orders/${o.id}`} className="font-bold text-navy hover:underline">{o.buyerName}</Link>
                        <div className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>{prettyPhone(o.mobile)}</div>
                        <div className="text-[11px] text-muted">{fa(o.number)} · <span dir="ltr">{o.shortCode}</span></div>
                        {canEdit && nx && o.stage !== "REGISTERED" && <div className="mt-2 lg:hidden"><StageButton value={`${o.id}:${nx}`}>← {STAGE[nx].short}</StageButton></div>}
                      </td>
                      <td className="p-3"><div className="max-w-[220px]">{o.items.map((i) => i.title + (i.qty > 1 ? ` ×${fa(i.qty)}` : "")).join("، ")}</div><div className="text-xs text-muted">{[o.grade, o.major].filter(Boolean).join(" · ")}</div></td>
                      <td className="p-3 text-xs">{BRANCH_LABEL[o.branch] ?? o.branch}</td>
                      <td className="p-3"><div className="font-semibold">{formatToman(o.totalRials)}</div><div className="text-[11px] text-muted">{o.payStatus === "PAID" ? PAY_METHOD[o.payMethod] ?? o.payMethod : "پرداخت نشده"}</div></td>
                      <td className="p-3"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${STAGE[o.stage].cls}`}><span className={`size-1.5 rounded-full ${STAGE[o.stage].dot}`} />{STAGE[o.stage].short}</span></td>
                      <td className="whitespace-nowrap p-3 text-xs text-muted">{jalaliDateTime(o.paidAt ?? o.createdAt)}</td>
                      <td className="hidden p-3 text-left lg:table-cell">{canEdit && nx && o.stage !== "REGISTERED" && <StageButton value={`${o.id}:${nx}`}>← {STAGE[nx].short}</StageButton>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link className="btn-ghost px-4 py-1.5" href={`/admin/shop/orders?${qs(sp, { page: String(page - 1) })}`}>قبلی</Link>}
          <span className="text-muted">صفحهٔ {fa(page)} از {fa(pages)}</span>
          {page < pages && <Link className="btn-ghost px-4 py-1.5" href={`/admin/shop/orders?${qs(sp, { page: String(page + 1) })}`}>بعدی</Link>}
        </div>
      )}
    </>
  );
}
