import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  archiveTeamMemberAction,
  deleteTeamMemberAction,
} from "@/app/admin/(dashboard)/website/team/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminTeamMembers } from "@/lib/website/team-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اعضای تیم" };

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function AdminTeamMembersPage({ searchParams }: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const q = typeof params.q === "string" ? params.q : "";

  const { members, total, page, pageCount } = await listAdminTeamMembers(
    session.organization.id,
    {
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
      q,
    },
  );

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q.trim()) query.set("q", q.trim());
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs ? `/admin/website/team?${qs}` : "/admin/website/team";
  };

  return (
    <>
      <AdminPageHeader
        title="اعضای تیم"
        description="مدیریت اعضای قابل‌نمایش در وب‌سایت مؤسسه علمی ستارگان"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "اعضای تیم" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/team/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          عضو جدید
        </Link>
        <Link
          href="/admin/website/team/departments"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          مدیریت دپارتمان‌ها
        </Link>
        <Link
          href="/team"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          مشاهده صفحه عمومی
        </Link>
      </div>

      <form
        method="get"
        className="admin-card mb-4 flex flex-wrap items-end gap-3 p-4"
      >
        <label className="min-w-[14rem] flex-1 text-sm">
          <span className="mb-1 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="نام، سمت یا اسلاگ"
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white"
        >
          فیلتر
        </button>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-background text-muted">
            <tr>
              <th className="px-3 py-3 text-start font-medium">عضو</th>
              <th className="px-3 py-3 text-start font-medium">دپارتمان</th>
              <th className="px-3 py-3 text-start font-medium">ترتیب</th>
              <th className="px-3 py-3 text-start font-medium">وضعیت</th>
              <th className="px-3 py-3 text-start font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  هنوز عضوی ثبت نشده است.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-b border-border/70">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-background text-sm font-semibold text-primary/70">
                        {member.fullName.slice(0, 1)}
                      </span>
                      <div>
                        <p className="font-medium text-primary">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-muted">{member.roleTitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{member.department.name}</td>
                  <td className="px-3 py-3">
                    {toPersianDigits(member.displayOrder)}
                    {member.isFeatured
                      ? ` · ویژه ${toPersianDigits(member.featuredPriority)}`
                      : ""}
                  </td>
                  <td className="px-3 py-3">
                    {!member.isActive
                      ? "غیرفعال"
                      : member.archivedAt
                        ? "بایگانی"
                        : member.isFeatured
                          ? "فعال · صفحه اصلی"
                          : "فعال"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/website/team/${member.id}`}
                        className="rounded-lg border border-border px-2 py-1 text-xs"
                      >
                        ویرایش
                      </Link>
                      <form action={archiveTeamMemberAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <button className="rounded-lg border border-border px-2 py-1 text-xs">
                          {member.archivedAt ? "خروج از بایگانی" : "بایگانی"}
                        </button>
                      </form>
                      <form action={deleteTeamMemberAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <button className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700">
                          حذف
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          {toPersianDigits(total)} عضو · صفحه {toPersianDigits(page)} از{" "}
          {toPersianDigits(pageCount)}
        </p>
        {pageCount > 1 ? (
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                قبلی
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                بعدی
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
