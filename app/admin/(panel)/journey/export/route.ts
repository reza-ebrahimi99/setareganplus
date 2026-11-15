import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { jalaliDateTime } from "@/lib/format";
import { FIELD_LABEL, FOLLOW, GRADE_LABEL, SKILLS } from "@/lib/journey/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requirePerm("journey.manage");
  const sp = req.nextUrl.searchParams;
  const grade = Number(sp.get("grade") || 0);
  const field = sp.get("field") || "";
  const follow = sp.get("follow") || "";
  const q = (sp.get("q") || "").trim();
  const rows = await prisma.journeyRun.findMany({
    where: {
      status: "DONE",
      ...(grade ? { grade } : {}),
      ...(field ? { field } : {}),
      ...(follow ? { followUp: follow } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { mobile: { contains: q } }] } : {}),
    },
    include: { answers: true },
    orderBy: { finishedAt: "desc" },
    take: 20000,
  });
  const header = ["نام", "موبایل", "موبایل خانواده", "پایه", "رشته", "مدرسه", "تاریخ", "پیگیری", ...SKILLS.map((s) => s.title), "ضعیف‌ترین"];
  const lines = rows.map((r) => {
    const ratios = SKILLS.map((s) => {
      const mine = r.answers.filter((a) => a.skillSlug === s.slug && !a.drill);
      if (!mine.length) return "";
      return Math.round((mine.filter((a) => a.correct).length / mine.length) * 100);
    });
    let worst = "";
    let worstR = 2;
    SKILLS.forEach((s, i) => {
      if (ratios[i] === "") return;
      const v = Number(ratios[i]) / 100;
      if (v < worstR) { worstR = v; worst = s.title; }
    });
    return [r.name, r.mobile, r.parentMobile, GRADE_LABEL[r.grade] ?? r.grade, FIELD_LABEL[r.field] ?? "", r.school, r.finishedAt ? jalaliDateTime(r.finishedAt) : "", FOLLOW.find((f) => f.id === r.followUp)?.label ?? r.followUp, ...ratios, worst];
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("سفر");
  ws.addRow(header);
  lines.forEach((row) => ws.addRow(row));
  ws.getRow(1).font = { bold: true };
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": "attachment; filename=\"safar.xlsx\"",
    },
  });
}
