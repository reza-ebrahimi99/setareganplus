import { NextResponse } from "next/server";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  buildChoiceTemplateWorkbook,
  workbookToBuffer,
} from "@/lib/guidance/choice-studio/excel";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireCounselorContext();
  const workbook = buildChoiceTemplateWorkbook();
  const buffer = await workbookToBuffer(workbook);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("قالب-چیدمان-انتخاب-رشته.xlsx")}`,
      "Cache-Control": "private, no-store",
    },
  });
}
