import type { Metadata } from "next";
import {
  AdmissionsWorkspace,
  AdmissionsWorkspaceError,
  AdmissionsWorkspaceForbidden,
} from "@/components/admin/admissions/AdmissionsWorkspace";
import { adminBreadcrumbs } from "@/content/admin";
import { permissionsForRole, PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { composeDashboard } from "@/lib/dashboard/compose";

export const metadata: Metadata = { title: "میز کار پذیرش" };
export const dynamic = "force-dynamic";

export default async function AdmissionsWorkspacePage() {
  const session = await requirePermission("reports.view");
  const permissions = session.user.isPlatformAdmin
    ? new Set(PERMISSIONS)
    : new Set(permissionsForRole(session.membership.role));
  const now = new Date();

  const composed = await composeDashboard({
    dashboardId: "admissions",
    ctx: {
      organizationId: session.organization.id,
      viewerUserId: session.user.id,
      membershipId: session.membership.id,
      permissions,
      allBranches: session.membership.allBranches,
      branchIds: session.membership.branchIds,
      from: new Date(now.getTime() - 30 * 86_400_000),
      to: now,
      includeLazy: true,
      session,
    },
  });

  if (!composed.ok) {
    if (composed.error === "FORBIDDEN") {
      return <AdmissionsWorkspaceForbidden />;
    }
    return <AdmissionsWorkspaceError message="داشبورد پذیرش یافت نشد." />;
  }

  return (
    <AdmissionsWorkspace
      dashboard={composed.dashboard}
      breadcrumbs={adminBreadcrumbs.admissions}
    />
  );
}
