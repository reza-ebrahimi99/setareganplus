import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { buildMeta } from "@/lib/seo";
import { gradeLabel, publicName, tehranMidnight, tehranWeekStart } from "@/lib/classes/catalog";
import { EmptyState } from "@/components/classes/ui";

export const metadata: Metadata = buildMeta({
  title: "برترین‌های هفته | کلاس‌های ویدیویی",
  description: "جدول امتیاز هفتگی دانش‌آموزان کلاس‌های ویدیویی ستارگان. فقط نام کوچک و حرف اول نام خانوادگی دیده می‌شود.",
  path: "/classes/leaderboard",
});

export default async function Leaderboard() {
  const start = tehranMidnight(tehranWeekStart());
  const grouped = await prisma.classPointLog.groupBy({ by: ["studentId"], where: { createdAt: { gte: start }, points: { gt: 0 } }, _sum: { points: true }, orderBy: { _sum: { points: "desc" } }, take: 20 });
  const students = await prisma.classStudent.findMany({ where: { id: { in: grouped.map((g) => g.studentId) } }, select: { id: true, firstName: true, lastName: true, grade: true } });
  const byId = new Map(students.map((s) => [s.id, s]));
  const rows = grouped.map((g) => ({ student: byId.get(g.studentId), points: g._sum.points || 0 })).filter((r) => r.student);

  return (
    <div className="container-x pb-16">
      <section className="cl-hero px-6 py-10">
        <p className="relative text-sm font-bold text-[#f4b21b]">از شنبه تا جمعه</p>
        <h1 className="cl-display relative text-4xl text-white">برترین‌های هفته</h1>
        <p className="relative mt-2 max-w-xl text-white/75">امتیاز تماشا و آزمون. برای حریم خصوصی فقط نام کوچک و حرف اول نام خانوادگی و پایه نشان داده می‌شود.</p>
      </section>
      {rows.length === 0 ? <div className="mt-6"><EmptyState title="این هفته هنوز امتیازی ثبت نشده" text="اولین نفری باش که یک جلسه را تمام می‌کند." href="/classes" action="شروع یک دوره" /></div> : (
        <ol className="mt-6 space-y-3">
          {rows.map((r, i) => (
            <li key={r.student!.id} className={`cl-card flex items-center gap-4 px-4 py-3 ${i < 3 ? "cl-lift" : ""}`}>
              <span className={`grid size-10 place-items-center rounded-full font-extrabold ${i === 0 ? "bg-[#f4b21b] text-[#0a1a3f]" : "bg-black/5"}`}>{fa(i + 1)}</span>
              <span className="min-w-0 flex-1">
                <b className="block">{publicName(r.student!.firstName, r.student!.lastName)}</b>
                <span className="cl-muted text-sm">{gradeLabel(r.student!.grade)}</span>
              </span>
              <b>{fa(r.points)} امتیاز</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
