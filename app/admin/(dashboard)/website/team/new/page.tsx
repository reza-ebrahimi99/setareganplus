import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TeamMemberForm } from "@/components/admin/website/TeamMemberForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminTeamDepartments } from "@/lib/website/team-departments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "عضو جدید تیم" };

export default async function NewTeamMemberPage() {
  const session = await requirePermission("website.manage");
  const departments = await listAdminTeamDepartments(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="عضو جدید تیم"
        description="افزودن عضو قابل‌نمایش در وب‌سایت مؤسسه"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "اعضای تیم", href: "/admin/website/team" },
          { label: "عضو جدید" },
        ]}
        compact
      />
      <TeamMemberForm
        mode="create"
        departments={departments
          .filter((d) => d.isActive && !d.archivedAt)
          .map((d) => ({ id: d.id, name: d.name }))}
      />
    </>
  );
}
