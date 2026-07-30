import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getAdminSession,
  type AdminSessionContext,
} from "@/lib/auth/require-admin";

export async function requireOpsSessionJson(): Promise<
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
  if (
    !hasPermission(session, "crm.view_assigned") &&
    !hasPermission(session, "crm.view_all")
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

export function resolveOpsBranchIds(
  session: AdminSessionContext,
  branchParam: string | null,
): string[] | undefined {
  const allowed = session.membership.allBranches
    ? undefined
    : session.membership.branchIds;
  if (branchParam) {
    if (allowed && !allowed.includes(branchParam)) return [];
    return [branchParam];
  }
  return allowed;
}
