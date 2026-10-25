import ExcelJS from "exceljs";
import { permOr403, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { querySubmissions, columnsFor, submissionRef, PAY_STATE } from "@/lib/submissions";
import { displayValue } from "@/lib/forms/validate";
import { jalaliDateTime } from "@/lib/format";

const ST: Record<string, string> = { NEW: "جدید", CONTACTED: "تماس گرفته شد", ENROLLED: "ثبت‌نام شد", ARCHIVED: "بایگانی" };

export async function GET(req: Request) {
  const me = await permOr403("submissions");
  if (me instanceof Response) return me;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { items } = await querySubmissions(sp);
  const form = sp.form ? await prisma.form.findUnique({ where: { id: sp.form } }) : null;
  const cols = columnsFor(items, form?.fields);
  const money = can(me, "forms.payments");
  const payHead = money ? ["وضعیت پرداخت", "مبلغ (تومان)", "کد تخفیف", "تخفیف (تومان)", "شماره پیگیری زیبال", "شماره مرجع بانک", "تاریخ پرداخت"] : ["وضعیت پرداخت"];
  const header = ["تاریخ ثبت", "کد پیگیری", "فرم", "وضعیت", ...payHead, ...cols.map((c) => c.label), "یادداشت"];
  const val = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) && "key" in (v as object) ? `${new URL(req.url).origin}/admin/files/${(v as { key: string }).key}` : displayValue(v);
  const data = items.map((it) => {
    const d = it.data as Record<string, unknown>;
    const ps = PAY_STATE[it.payState]?.label ?? it.payState;
    const pay = money
      ? [ps, it.amountRials ? Math.round(it.amountRials / 10) : 0, it.discountCode ?? "", it.discountRials ? Math.round(it.discountRials / 10) : 0, it.payments[0]?.trackId ?? "", it.payments[0]?.refNumber ?? "", it.paidAt ? jalaliDateTime(it.paidAt) : ""]
      : [ps];
    return [jalaliDateTime(it.createdAt), submissionRef(it.id), it.form.title, ST[it.status], ...pay, ...cols.map((c) => val(d[c.id])), it.note ?? ""];
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `submissions-${form?.slug ?? "all"}-${stamp}`;

  if (sp.format === "csv") {
    const esc = (x: string) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
    const csv = "\uFEFF" + [header, ...data].map((r) => r.map((x) => esc(String(x))).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("درخواست‌ها", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.addRow(header);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF8F3" } };
  data.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, i) => (c.width = Math.min(40, Math.max(12, header[i].length + 4))));
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}
