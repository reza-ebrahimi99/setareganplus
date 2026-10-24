import ExcelJS from "exceljs";
import { permOr403 } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { querySubmissions, columnsFor } from "@/lib/submissions";
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
  const header = ["تاریخ ثبت", "فرم", "وضعیت", ...cols.map((c) => c.label), "یادداشت"];
  const val = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) && "key" in (v as object) ? `${new URL(req.url).origin}/admin/files/${(v as { key: string }).key}` : displayValue(v);
  const data = items.map((it) => {
    const d = it.data as Record<string, unknown>;
    return [jalaliDateTime(it.createdAt), it.form.title, ST[it.status], ...cols.map((c) => val(d[c.id])), it.note ?? ""];
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
