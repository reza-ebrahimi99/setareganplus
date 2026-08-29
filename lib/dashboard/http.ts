import { NextResponse } from "next/server";
import {
  hasPermission,
  permissionsForRole,
  PERMISSIONS,
} from "@/lib/auth/permissions";
import { getAdminSession } from "@/lib/auth/require-admin";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";
import { parseKpiDateRange, resolveBranchScope } from "@/lib/kpi/http";

export async function requireDashboardSessionJson(): Promise<
  | { ok: true; session: AdminSessionContext }
  | { ok: false; response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }
  const can =
    hasPermission(session, "reports.view") ||
    hasPermission(session, "crm.view_assigned") ||
    hasPermission(session, "crm.view_all");
  if (!can) {
    return {
      ok: false,
      response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

export function sessionPermissionSet(
  session: AdminSessionContext,
): Set<string> {
  if (session.user.isPlatformAdmin) {
    return new Set(PERMISSIONS);
  }
  return new Set(permissionsForRole(session.membership.role));
}

export function buildComposeContext(params: {
  session: AdminSessionContext;
  url: URL;
  includeSession?: boolean;
}): DashboardComposeContext {
  const { from, to } = parseKpiDateRange(params.url);
  const branchIds = resolveBranchScope(
    params.session,
    params.url.searchParams.get("branch"),
  );
  const includeLazy =
    params.url.searchParams.get("includeLazy") === "1" ||
    params.url.searchParams.get("lazy") === "1";

  return {
    organizationId: params.session.organization.id,
    viewerUserId: params.session.user.id,
    membershipId: params.session.membership.id,
    permissions: sessionPermissionSet(params.session),
    allBranches:
      params.session.membership.allBranches &&
      !params.url.searchParams.get("branch"),
    branchIds: branchIds ?? params.session.membership.branchIds,
    from,
    to,
    includeLazy,
    session: params.includeSession ? params.session : undefined,
  };
}
