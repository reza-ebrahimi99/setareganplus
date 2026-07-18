import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TeamMemberForm } from "@/components/admin/website/TeamMemberForm";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  loadAdminTeamMember,
  portraitPublicUrl,
} from "@/lib/website/team-admin";
import { listAdminTeamDepartments } from "@/lib/website/team-departments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش عضو تیم" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTeamMemberPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requirePermission("website.manage");
  const [member, departments] = await Promise.all([
    loadAdminTeamMember(session.organization.id, id),
    listAdminTeamDepartments(session.organization.id),
  ]);
  if (!member) notFound();

  return (
    <>
      <AdminPageHeader
        title={`ویرایش ${member.fullName}`}
        description="به‌روزرسانی پروفایل عمومی عضو تیم"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "اعضای تیم", href: "/admin/website/team" },
          { label: member.fullName },
        ]}
        compact
      />
      <TeamMemberForm
        mode="edit"
        departments={departments
          .filter((d) => d.isActive && !d.archivedAt)
          .map((d) => ({ id: d.id, name: d.name }))}
        member={{
          id: member.id,
          fullName: member.fullName,
          roleTitle: member.roleTitle,
          departmentId: member.departmentId,
          biography: member.biography,
          specialty: member.specialty,
          email: member.email,
          phone: member.phone,
          instagramUrl: member.instagramUrl,
          linkedinUrl: member.linkedinUrl,
          websiteUrl: member.websiteUrl,
          slug: member.slug,
          seoTitle: member.seoTitle,
          seoDescription: member.seoDescription,
          displayOrder: member.displayOrder,
          featuredPriority: member.featuredPriority,
          isActive: member.isActive,
          isFeatured: member.isFeatured,
          archivedAt: member.archivedAt,
          portraitUrl: portraitPublicUrl(member.portraitMedia, "w480"),
        }}
      />
    </>
  );
}
