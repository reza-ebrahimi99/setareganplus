import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa } from "@/lib/format";
import { gradeLabel } from "@/lib/classes/catalog";
import { PageTitle } from "@/components/admin/ui";

export default async function ClassReport() {
  await requirePerm("classes.manage");
  const [students, lessons] = await Promise.all([
    prisma.classStudent.findMany({ orderBy: { points: "desc" }, take: 300, include: { progress: true, enrollments: true } }),
    prisma.classLesson.findMany({ where: { published: true }, include: { course: { select: { title: true } }, progress: true }, orderBy: { course: { sortOrder: "asc" } } }),
  ]);
  return (
    <>
      <PageTitle title="گزارش کلاس‌ها" action={<span className="flex gap-2"><a className="btn-navy px-3 py-2 text-sm" href="/admin/classes/report/export?kind=students">CSV دانش‌آموزان</a><a className="btn-ghost px-3 py-2 text-sm" href="/admin/classes/report/export?kind=videos">CSV جلسه‌ها</a></span>} />
      <h2 className="mb-2 font-extrabold">دانش‌آموزان</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="text-muted"><tr><th className="p-2 text-right">نام</th><th>پایه</th><th>دوره</th><th>جلسهٔ دیده‌شده</th><th>دقیقه</th><th>امتیاز</th></tr></thead>
          <tbody>
            {students.map((st) => {
              const done = st.progress.filter((p) => p.completed).length;
              const min = Math.round(st.progress.reduce((s, p) => s + p.secondsWatched, 0) / 60);
              return <tr key={st.id} className="border-t border-line"><td className="p-2">{st.firstName} {st.lastName}<div className="text-xs text-muted" dir="ltr">{st.mobile}</div></td><td>{gradeLabel(st.grade)}</td><td className="text-center">{fa(st.enrollments.length)}</td><td className="text-center">{fa(done)}</td><td className="text-center">{fa(min)}</td><td className="text-center">{fa(st.points)}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <h2 className="mt-8 mb-2 font-extrabold">جلسه‌ها</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="text-muted"><tr><th className="p-2 text-right">جلسه</th><th>دانش‌آموز</th><th>بازدید</th><th>تمام‌شده</th><th>دقیقه</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="p-2"><b>{l.title}</b><div className="text-xs text-muted">{l.course.title}</div></td>
                <td className="text-center">{fa(l.progress.length)}</td>
                <td className="text-center">{fa(l.progress.reduce((s, p) => s + p.opens, 0))}</td>
                <td className="text-center">{fa(l.progress.filter((p) => p.completed).length)}</td>
                <td className="text-center">{fa(Math.round(l.progress.reduce((s, p) => s + p.secondsWatched, 0) / 60))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm"><Link href="/admin/classes" className="font-bold">بازگشت</Link></p>
    </>
  );
}
