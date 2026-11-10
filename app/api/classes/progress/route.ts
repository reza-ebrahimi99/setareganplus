import { NextResponse } from "next/server";
import { getClassStudent } from "@/lib/classes/session";
import { recordHeartbeat } from "@/lib/classes/watch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const student = await getClassStudent();
  if (!student) return NextResponse.json({ ok: false, error: "login" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { lessonId?: unknown; delta?: unknown } | null;
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId : "";
  const delta = typeof body?.delta === "number" ? body.delta : Number(body?.delta);
  if (!lessonId || !Number.isFinite(delta)) return NextResponse.json({ ok: false }, { status: 400 });
  const res = await recordHeartbeat(student.id, lessonId, delta);
  return NextResponse.json(res);
}
