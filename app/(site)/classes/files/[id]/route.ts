import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { permOr403 } from "@/lib/auth";
import { uploadRoot, safeJoin } from "@/lib/uploads";
import { getClassStudent } from "@/lib/classes/session";
import { canDownloadClassFile } from "@/lib/classes/catalog";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const file = await prisma.classFile.findUnique({ where: { id }, include: { course: true, lesson: true } });
  if (!file || !file.published) return new Response("Not found", { status: 404 });
  const courseId = file.courseId || file.lesson?.courseId || null;
  const admin = await permOr403("classes.manage");
  const staff = !(admin instanceof Response);
  if (!staff) {
    const student = await getClassStudent();
    const enrolled = student && courseId ? await prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId } } }) : null;
    if (!canDownloadClassFile({ staff: false, hasStudent: !!student, enrolled: !!enrolled, courseId })) {
      return new Response(student ? "Forbidden" : "Unauthorized", { status: student ? 403 : 401 });
    }
  }
  const abs = safeJoin(path.join(uploadRoot(), "private"), file.storageKey.split("/"));
  if (!abs) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(abs);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": file.mime || "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
