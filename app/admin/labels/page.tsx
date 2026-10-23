import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { qrSvg, ticketUrl } from "@/lib/shop/qr";
import { BRANCH_LABEL } from "@/lib/shop/config";
import { fa, prettyPhone } from "@/lib/format";
import { PrintButton } from "@/components/shop/PrintButton";

export const metadata = { title: "برچسب سفارش‌ها", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Labels({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  if (!(await getAdmin())) redirect("/admin/login");
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 300);
  const orders = await prisma.order.findMany({ where: { id: { in: ids } }, include: { items: true }, orderBy: [{ branch: "asc" }, { buyerName: "asc" }] });
  const qrs = await Promise.all(orders.map((o) => qrSvg(ticketUrl(o.qrToken))));
  return (
    <div className="min-h-dvh bg-white p-6 print:p-0">
      <style>{`@page { size: A4; margin: 8mm } @media print { header, footer, nav { display: none !important } }`}</style>
      <div className="mb-5 flex items-center gap-4 print:hidden">
        <h1 className="text-xl font-extrabold text-navy">برچسب {fa(orders.length)} سفارش</h1>
        <PrintButton />
      </div>
      <div className="grid grid-cols-2 gap-3 print:gap-[3mm]">
        {orders.map((o, i) => (
          <div key={o.id} className="flex break-inside-avoid items-center gap-3 rounded-xl border-2 border-dashed border-navy/30 p-3">
            <div className="w-24 shrink-0" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
            <div className="min-w-0 text-sm leading-6">
              <p className="text-base font-extrabold text-navy">{o.buyerName}</p>
              <p dir="ltr" className="text-right">{prettyPhone(o.mobile)}</p>
              <p className="truncate">{o.items.map((x) => x.title + (x.qty > 1 ? ` ×${fa(x.qty)}` : "")).join("، ")}</p>
              <p className="text-xs">{[o.grade, o.major].filter(Boolean).join(" · ")} — <b>{BRANCH_LABEL[o.branch] ?? o.branch}</b></p>
              <p className="font-mono text-lg font-bold tracking-[0.25em]" dir="ltr" style={{ textAlign: "right" }}>{o.shortCode}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
