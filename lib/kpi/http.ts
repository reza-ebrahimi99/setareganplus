/**
 * Shared helpers for read-only KPI HTTP routes.
 */

import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getAdminSession } from "@/lib/auth/require-admin";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { jalaliTehranLocalToUtc, parseJalaliDateInput } from "@/lib/datetime/jalali";

export async function requireReportsViewJson(): Promise<
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
  if (!hasPermission(session, "reports.view")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

export function resolveBranchScope(
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

export function parseKpiDateRange(url: URL): { from: Date; to: Date } {
  const now = new Date();
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const fromIso = fromRaw && !Number.isNaN(Date.parse(fromRaw))
    ? new Date(fromRaw)
    : null;
  const toIso = toRaw && !Number.isNaN(Date.parse(toRaw))
    ? new Date(toRaw)
    : null;

  if (fromIso && toIso) {
    return { from: fromIso, to: toIso };
  }

  const fromJalali = fromRaw ? parseJalaliDateInput(fromRaw) : null;
  const toJalali = toRaw ? parseJalaliDateInput(toRaw) : null;
  const from = fromJalali
    ? jalaliTehranLocalToUtc(fromJalali.jy, fromJalali.jm, fromJalali.jd, 0, 0)
    : fromIso ?? new Date(now.getTime() - 30 * 86_400_000);
  const to = toJalali
    ? jalaliTehranLocalToUtc(toJalali.jy, toJalali.jm, toJalali.jd, 23, 59)
    : toIso ?? now;
  return { from, to };
}
