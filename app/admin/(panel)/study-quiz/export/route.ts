import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { jalaliDateTime, toEn } from "@/lib/format";
import { ARCHETYPES } from "@/lib/quiz/content";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requirePerm("campaign.studyQuiz");
  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const where: Record<string, unknown> = {};
  const archetype = sp.get("archetype") || "";
  const grade = sp.get("grade") || "";
  const contacted = sp.get("contacted") || "";
  const q = sp.get("q") || "";
  if (archetype) where.archetype = archetype;
  if (grade) where.grade = grade;
  if (contacted === "1") where.contacted = true;
  if (contacted === "0") where.contacted = false;
  if (q.trim()) {
    const qq = toEn(q.trim());
    where.OR = [
      { firstName: { contains: q.trim() } },
      { lastName: { contains: q.trim() } },
      { mobile: { contains: qq } },
      { rewardCode: { contains: qq.toUpperCase() } },
    ];
  }
  const rows = await prisma.studyQuizLead.findMany({ where, orderBy: { createdAt: "desc" }, take: 20000 });
  const header = ["نام", "نام خانوادگی", "موبایل", "پایه", "رشته", "الگو", "کد هدیه", "معرف", "تماس", "یادداشت", "تاریخ"];
  const lines = rows.map((r) => [
    r.firstName,
    r.lastName,
    r.mobile,
    r.grade,
    r.field ?? "",
    ARCHETYPES[r.archetype as keyof typeof ARCHETYPES]?.name ?? r.archetype,
    r.rewardCode,
    r.referral ?? "",
    r.contacted ? "بله" : "خیر",
    r.note ?? "",
    jalaliDateTime(r.createdAt),
  ]);

  if (format === "csv") {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const body = "\uFEFF" + [header, ...lines].map((row) => row.map((c) => esc(String(c))).join(",")).join("\n");
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="study-quiz-leads.csv"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("لیدهای تست مطالعه");
  ws.addRow(header);
  lines.forEach((row) => ws.addRow(row));
  ws.getRow(1).font = { bold: true };
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="study-quiz-leads.xlsx"`,
    },
  });
}
