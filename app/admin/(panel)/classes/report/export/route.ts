import { prisma } from "@/lib/prisma";
import { permOr403 } from "@/lib/auth";
import { gradeLabel } from "@/lib/classes/catalog";

export const dynamic = "force-dynamic";

function csv(rows: string[][]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\n");
}

export async function GET(req: Request) {
  const me = await permOr403("classes.manage");
  if (me instanceof Response) return me;
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind === "videos") {
    const lessons = await prisma.classLesson.findMany({ include: { course: true, progress: true }, orderBy: { title: "asc" } });
    const body = csv([
      ["دوره", "جلسه", "دانش‌آموز", "بازدید", "تمام‌شده", "دقیقه"],
      ...lessons.map((l) => [l.course.title, l.title, String(l.progress.length), String(l.progress.reduce((s, p) => s + p.opens, 0)), String(l.progress.filter((p) => p.completed).length), String(Math.round(l.progress.reduce((s, p) => s + p.secondsWatched, 0) / 60))]),
    ]);
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=class-videos.csv" } });
  }
  const students = await prisma.classStudent.findMany({ include: { progress: true, enrollments: true }, orderBy: { points: "desc" } });
  const body = csv([
    ["نام", "نام خانوادگی", "موبایل", "پایه", "رشته", "دوره", "جلسهٔ دیده‌شده", "دقیقه", "امتیاز", "روز پیاپی"],
    ...students.map((st) => [st.firstName, st.lastName, st.mobile, gradeLabel(st.grade), st.field || "", String(st.enrollments.length), String(st.progress.filter((p) => p.completed).length), String(Math.round(st.progress.reduce((s, p) => s + p.secondsWatched, 0) / 60)), String(st.points), String(st.streak)]),
  ]);
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=class-students.csv" } });
}
