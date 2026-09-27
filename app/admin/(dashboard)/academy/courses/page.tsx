import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { createAcademyCourseAction } from "@/app/admin/(dashboard)/academy/actions";
import { formatTomanFromRials } from "@/lib/academy/money";
import { prisma } from "@/lib/prisma";

export default async function AdminAcademyCoursesPage() {
  const session = await requireAdminSession();
  assertPermission(session, "academy.manage");
  const orgId = session.organization.id;

  const courses = await prisma.academyCourse.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold">دوره‌های آکادمی</h1>

      <form action={createAcademyCourseAction} className="rounded-xl border bg-surface p-6 space-y-3 max-w-xl">
        <h2 className="font-semibold">دوره جدید</h2>
        <input
          name="title"
          required
          placeholder="عنوان دوره"
          className="w-full rounded-lg border px-3 py-2"
        />
        <input
          name="slug"
          required
          placeholder="slug-latin"
          dir="ltr"
          className="w-full rounded-lg border px-3 py-2 text-left"
        />
        <input
          name="priceRials"
          type="number"
          min={0}
          placeholder="قیمت (ریال)"
          dir="ltr"
          className="w-full rounded-lg border px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-white text-sm">
          ایجاد پیش‌نویس
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="text-muted">هنوز دوره‌ای ثبت نشده است.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted">
              <th className="py-2 text-right">عنوان</th>
              <th className="py-2 text-right">وضعیت</th>
              <th className="py-2 text-right">قیمت</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-3">
                  <Link href={`/admin/academy/courses/${c.id}`} className="font-medium hover:text-secondary">
                    {c.title}
                  </Link>
                </td>
                <td>{c.status}</td>
                <td dir="ltr">{formatTomanFromRials(c.priceRials)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
