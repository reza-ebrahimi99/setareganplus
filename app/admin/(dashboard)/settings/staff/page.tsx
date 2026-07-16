import type { Metadata } from "next";
import {
  MembershipStatus,
  SystemRole,
} from "@/generated/prisma/enums";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  ROLE_LABELS,
  STAFF_ASSIGNABLE_ROLES,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";
import {
  createStaffAction,
  revokeStaffSessionsAction,
  sendStaffInvitationAction,
  setStaffActiveAction,
  updateStaffAction,
} from "./actions";

export const metadata: Metadata = { title: "مدیریت همکاران" };
export const dynamic = "force-dynamic";

function maskMobile(mobile: string | null): string {
  if (!mobile || mobile.length < 7) return "—";
  return `${mobile.slice(0, 4)}•••${mobile.slice(-2)}`;
}

function StaffFields({
  branches,
  initial,
}: {
  branches: Array<{ id: string; name: string }>;
  initial?: {
    firstName: string;
    lastName: string;
    mobile: string | null;
    email: string | null;
    role: SystemRole;
    branchIds: string[];
  };
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input name="firstName" required defaultValue={initial?.firstName} placeholder="نام" className="w-full rounded-lg border border-border bg-white px-3 py-2" />
      <input name="lastName" required defaultValue={initial?.lastName} placeholder="نام خانوادگی" className="w-full rounded-lg border border-border bg-white px-3 py-2" />
      <input name="mobile" required inputMode="tel" dir="ltr" defaultValue={initial?.mobile ?? ""} placeholder="09xxxxxxxxx" className="w-full rounded-lg border border-border bg-white px-3 py-2" />
      <input name="email" type="email" dir="ltr" defaultValue={initial?.email ?? ""} placeholder="ایمیل (اختیاری)" className="w-full rounded-lg border border-border bg-white px-3 py-2" />
      <select name="role" required defaultValue={initial?.role ?? SystemRole.ADMISSIONS_AGENT} className="w-full rounded-lg border border-border bg-white px-3 py-2">
        {STAFF_ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </select>
      <label className="flex items-center gap-2 rounded-lg border border-border px-3 text-sm">
        <input name="allBranches" value="true" type="checkbox" defaultChecked={!initial || initial.branchIds.length === 0} />
        دسترسی به همه شعب
      </label>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-medium">شعب مجاز (در صورت غیرفعال بودن «همه شعب»)</legend>
        <div className="flex flex-wrap gap-3">
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-center gap-2 text-sm">
              <input name="branchIds" value={branch.id} type="checkbox" defaultChecked={initial?.branchIds.includes(branch.id)} />
              {branch.name}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export default async function StaffPage() {
  const session = await requirePermission("staff.manage");
  const organizationId = session.organization.id;
  const [staff, branches] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        role: true,
        status: true,
        branchMemberships: {
          where: { deletedAt: null },
          select: { branchId: true, branch: { select: { name: true } } },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobile: true,
            email: true,
            lastLoginAt: true,
            _count: {
              select: {
                ownedLeads: { where: { organizationId, deletedAt: null } },
                assignedCrmTasks: { where: { organizationId, deletedAt: null } },
              },
            },
          },
        },
      },
    }),
    prisma.branch.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <AdminPageHeader title="مدیریت همکاران" description="حساب مستقل، نقش، شعب مجاز و نشست‌های هر همکار" breadcrumbs={[{ label: "مدیریت", href: "/admin" }, { label: "تنظیمات" }, { label: "همکاران" }]} compact />
      <details className="admin-card mb-6 p-5">
        <summary className="cursor-pointer font-semibold text-primary">افزودن همکار</summary>
        <form action={createStaffAction} className="mt-5 space-y-4">
          <StaffFields branches={branches} />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" type="submit">ایجاد حساب فعال</button>
        </form>
      </details>
      <div className="space-y-4">
        {staff.map((member) => {
          const owner = member.role === SystemRole.ORGANIZATION_OWNER;
          const active = member.status === MembershipStatus.ACTIVE;
          const branchIds = member.branchMemberships.map((scope) => scope.branchId);
          return (
            <article key={member.id} className="admin-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-primary">{member.user.firstName} {member.user.lastName}</h2>
                  <p className="mt-1 text-sm text-muted">{ROLE_LABELS[member.role]} · {active ? "فعال" : "غیرفعال"} · {maskMobile(member.user.mobile)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {branchIds.length === 0 ? "همه شعب" : member.branchMemberships.map((scope) => scope.branch.name).join("، ")}
                    {" · "}آخرین ورود: {member.user.lastLoginAt ? formatJalaliDateShort(member.user.lastLoginAt) : "ثبت نشده"}
                  </p>
                </div>
                <div className="text-left text-xs text-muted">
                  <p>{member.user._count.ownedLeads} لید</p>
                  <p>{member.user._count.assignedCrmTasks} وظیفه</p>
                </div>
              </div>
              {!owner && (
                <>
                  <details className="mt-4 border-t border-border pt-4">
                    <summary className="cursor-pointer text-sm font-medium">ویرایش مشخصات و دسترسی</summary>
                    <form action={updateStaffAction} className="mt-4 space-y-4">
                      <input type="hidden" name="membershipId" value={member.id} />
                      <StaffFields branches={branches} initial={{ ...member.user, role: member.role, branchIds }} />
                      <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" type="submit">ذخیره تغییرات</button>
                    </form>
                  </details>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={setStaffActiveAction}>
                      <input type="hidden" name="membershipId" value={member.id} />
                      <input type="hidden" name="active" value={active ? "false" : "true"} />
                      <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">{active ? "غیرفعال‌سازی" : "فعال‌سازی"}</button>
                    </form>
                    <form action={revokeStaffSessionsAction}>
                      <input type="hidden" name="membershipId" value={member.id} />
                      <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">لغو همه نشست‌ها</button>
                    </form>
                    <form action={sendStaffInvitationAction}>
                      <input type="hidden" name="membershipId" value={member.id} />
                      <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">ارسال کد دعوت</button>
                    </form>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
