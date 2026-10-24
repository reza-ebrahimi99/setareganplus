import ExcelJS from "exceljs";
import { permOr403 } from "@/lib/auth";
import { queryOrders, type OrderQuery } from "@/lib/shop/admin";
import { STAGE, BRANCH_LABEL, PAY_METHOD, toman } from "@/lib/shop/config";
import { jalaliDateTime } from "@/lib/format";

export async function GET(req: Request) {
  const me = await permOr403("shop.orders.view");
  if (me instanceof Response) return me;
  const sp = Object.fromEntries(new URL(req.url).searchParams) as OrderQuery & { format?: string };
  const { items } = await queryOrders(sp, true);
  const header = ["شماره سفارش", "کد تحویل", "تاریخ ثبت", "تاریخ پرداخت", "نام خریدار", "موبایل", "کد ملی", "پایه", "رشته", "شعبه", "جزوه", "تعداد", "مبلغ (تومان)", "روش پرداخت", "وضعیت", "تحویل‌گیرنده", "یادداشت"];
  const data = items.map((o) => [
    o.number, o.shortCode, jalaliDateTime(o.createdAt), o.paidAt ? jalaliDateTime(o.paidAt) : "", o.buyerName, o.mobile, o.nationalCode ?? "", o.grade ?? "", o.major ?? "",
    BRANCH_LABEL[o.branch] ?? o.branch, o.items.map((i) => i.title).join("، "), o.items.reduce((a, i) => a + i.qty, 0), toman(o.totalRials),
    o.payStatus === "PAID" ? PAY_METHOD[o.payMethod] ?? o.payMethod : "پرداخت نشده", STAGE[o.stage].label, o.deliveredTo ?? "", o.adminNote ?? "",
  ]);
  const name = `booklet-orders-${new Date().toISOString().slice(0, 10)}`;
  if (sp.format === "csv") {
    const esc = (x: string) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
    const csv = "\uFEFF" + [header, ...data].map((r) => r.map((x) => esc(String(x))).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("سفارش‌ها", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.addRow(header);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF8F3" } };
  data.forEach((r) => ws.addRow(r));
  ws.getColumn(13).numFmt = "#,##0";
  ws.columns.forEach((c, i) => (c.width = Math.min(40, Math.max(12, header[i].length + 4))));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` },
  });
}
