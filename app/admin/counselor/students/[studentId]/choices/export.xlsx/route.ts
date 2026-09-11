import { NextResponse } from "next/server";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { loadChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import {
  buildChoiceExportWorkbook,
  workbookToBuffer,
} from "@/lib/guidance/choice-studio/excel";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await context.params;
  const ctx = await requireCounselorContext();
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "FINAL" ? CHOICE_LIST_KIND.FINAL : CHOICE_LIST_KIND.INITIAL;

  const [bundle, plan] = await Promise.all([
    loadCounselorCaseBundle(ctx, studentId),
    loadGuidanceV2Plan({ organizationId: ctx.organizationId, studentId }),
  ]);
  if (!plan) {
    return NextResponse.json({ error: "پرونده یافت نشد." }, { status: 404 });
  }

  const list = await loadChoiceListView({
    organizationId: ctx.organizationId,
    planId: plan.id,
    kind,
    includeInactive: false,
  });
  if (!list || list.items.length === 0) {
    return NextResponse.json({ error: "فهرستی برای خروجی وجود ندارد." }, { status: 404 });
  }

  const title = kind === "FINAL" ? "نسخه نهایی انتخاب رشته" : "نسخه اولیه چیدمان انتخاب رشته";
  const workbook = buildChoiceExportWorkbook({
    title,
    studentName: bundle.caseModel.studentName,
    items: list.items,
  });
  const buffer = await workbookToBuffer(workbook);
  const filename =
    kind === "FINAL"
      ? `چیدمان-نهایی-${bundle.caseModel.studentName}.xlsx`
      : `چیدمان-اولیه-${bundle.caseModel.studentName}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
