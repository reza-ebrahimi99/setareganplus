import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";
import { runChoiceDraftImport } from "@/lib/counselor-os/choice-draft-import";
import {
  assertCounselorMutationOrigin,
  requireCounselorSessionJson,
} from "@/lib/counselor-os/http";

export const dynamic = "force-dynamic";

function refreshCounselorStudentPaths(studentId: string) {
  revalidatePath(`/admin/counselor/students/${studentId}`);
  revalidatePath(`/admin/counselor/students/${studentId}/choices`);
  revalidatePath("/admin/counselor");
  revalidatePath("/portal/student/services/guidance");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const started = Date.now();
  const { studentId } = await context.params;

  if (!assertCounselorMutationOrigin(request)) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  }

  const auth = await requireCounselorSessionJson();
  if (!auth.ok) return auth.response;

  console.info("[choice-studio]", {
    phase: "import.request.started",
    studentId,
    requestId: request.headers.get("x-choice-import-id") ?? undefined,
  });

  try {
    await assertCounselorCanAccessStudent({
      organizationId: auth.ctx.organizationId,
      counselorUserId: auth.ctx.userId,
      studentId,
      canReview: auth.ctx.canReview,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "FORBIDDEN";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON نامعتبر است." }, { status: 400 });
  }

  const result = await runChoiceDraftImport({
    organizationId: auth.ctx.organizationId,
    counselorUserId: auth.ctx.userId,
    studentId,
    payload,
  });

  if (!result.ok) {
    console.info("[choice-studio]", {
      phase: "import.response.sent",
      studentId,
      ok: false,
      status: result.status,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(result, { status: result.status });
  }

  if (!result.idempotentReplay) {
    refreshCounselorStudentPaths(studentId);
  }

  console.info("[choice-studio]", {
    phase: "import.response.sent",
    studentId,
    requestId: result.requestId,
    ok: true,
    importedCount: result.importedCount,
    draftCount: result.draftCount,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(result);
}
