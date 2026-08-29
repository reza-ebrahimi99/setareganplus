/**
 * Authorize claimable queue entities (Sprint 6.6).
 */

import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import type {
  OpsEntityType as OpsEntityTypeValue,
} from "@/lib/ops/types";
import { prisma } from "@/lib/prisma";

export type ClaimAuthzResult =
  | { ok: true; branchId: string | null }
  | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN_BRANCH" | "FORBIDDEN_OWNER" };

function branchAllowed(
  session: AdminSessionContext,
  branchId: string | null,
): boolean {
  if (session.membership.allBranches) return true;
  if (!branchId) return false;
  return session.membership.branchIds.includes(branchId);
}

/**
 * Verify entity exists in org and caller may work it (branch + owner scope).
 */
export async function authorizeClaimableEntity(params: {
  session: AdminSessionContext;
  organizationId: string;
  entityType: OpsEntityTypeValue;
  entityId: string;
}): Promise<ClaimAuthzResult> {
  const { session, organizationId, entityType, entityId } = params;
  const viewAll = hasPermission(session, "crm.view_all");

  if (entityType === "LEAD") {
    const lead = await prisma.lead.findFirst({
      where: { id: entityId, organizationId, deletedAt: null },
      select: { id: true, branchId: true, ownerUserId: true },
    });
    if (!lead) {
      return { ok: false, error: "لید یافت نشد.", code: "NOT_FOUND" };
    }
    if (!branchAllowed(session, lead.branchId)) {
      return {
        ok: false,
        error: "دسترسی به شعبه این لید ندارید.",
        code: "FORBIDDEN_BRANCH",
      };
    }
    if (
      !viewAll &&
      lead.ownerUserId != null &&
      lead.ownerUserId !== session.user.id
    ) {
      return {
        ok: false,
        error: "این لید به شما واگذار نشده است.",
        code: "FORBIDDEN_OWNER",
      };
    }
    return { ok: true, branchId: lead.branchId };
  }

  if (entityType === "CRM_TASK") {
    const task = await prisma.crmTask.findFirst({
      where: { id: entityId, organizationId, deletedAt: null },
      select: {
        id: true,
        assignedToUserId: true,
        lead: {
          select: { branchId: true, ownerUserId: true },
        },
      },
    });
    if (!task) {
      return { ok: false, error: "وظیفه یافت نشد.", code: "NOT_FOUND" };
    }
    if (!branchAllowed(session, task.lead.branchId)) {
      return {
        ok: false,
        error: "دسترسی به شعبه این وظیفه ندارید.",
        code: "FORBIDDEN_BRANCH",
      };
    }
    if (
      !viewAll &&
      task.assignedToUserId != null &&
      task.assignedToUserId !== session.user.id &&
      task.lead.ownerUserId !== session.user.id
    ) {
      return {
        ok: false,
        error: "این وظیفه به شما واگذار نشده است.",
        code: "FORBIDDEN_OWNER",
      };
    }
    return { ok: true, branchId: task.lead.branchId };
  }

  // REGISTRATION
  const reg = await prisma.registration.findFirst({
    where: { id: entityId, organizationId, deletedAt: null },
    select: { id: true, branchId: true, leadId: true },
  });
  if (!reg) {
    return { ok: false, error: "ثبت‌نام یافت نشد.", code: "NOT_FOUND" };
  }
  if (!branchAllowed(session, reg.branchId)) {
    return {
      ok: false,
      error: "دسترسی به شعبه این ثبت‌نام ندارید.",
      code: "FORBIDDEN_BRANCH",
    };
  }
  if (!viewAll && reg.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: reg.leadId, organizationId, deletedAt: null },
      select: { ownerUserId: true },
    });
    if (
      lead &&
      lead.ownerUserId != null &&
      lead.ownerUserId !== session.user.id
    ) {
      return {
        ok: false,
        error: "ثبت‌نام مرتبط با لید شما نیست.",
        code: "FORBIDDEN_OWNER",
      };
    }
  }
  return { ok: true, branchId: reg.branchId };
}
