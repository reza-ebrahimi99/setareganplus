import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { listOpsQueueCatalog } from "@/lib/ops/catalog";
import { authorizeClaimableEntity } from "@/lib/ops/claim-authz";
import {
  claimQueueItem,
  clampClaimTtlMs,
  heartbeatQueueClaim,
  releaseQueueClaim,
} from "@/lib/ops/claims";
import {
  dispatchLeadAssignment,
} from "@/lib/ops/capacity";
import { escalateAndReassign, resolveEscalation } from "@/lib/ops/escalation";
import { requireOpsSessionJson, resolveOpsBranchIds } from "@/lib/ops/http";
import { isOpsQueueId, listOperationalQueue } from "@/lib/ops/list";
import type { OpsEntityType, OpsQueueId } from "@/lib/ops/types";

export const dynamic = "force-dynamic";

/**
 * GET /admin/ops/queues?queueId=ASSIGNMENT&branch=&limit=
 * Read-only list of OperationalQueueItem[].
 */
export async function GET(request: Request) {
  const auth = await requireOpsSessionJson();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  if (url.searchParams.get("catalog") === "1") {
    return NextResponse.json({
      organizationId: auth.session.organization.id,
      catalog: listOpsQueueCatalog(),
    });
  }

  const queueRaw = url.searchParams.get("queueId");
  if (!queueRaw || !isOpsQueueId(queueRaw)) {
    return NextResponse.json(
      { error: "INVALID_QUEUE", message: "queueId is required." },
      { status: 400 },
    );
  }

  const branchIds = resolveOpsBranchIds(
    auth.session,
    url.searchParams.get("branch"),
  );
  if (branchIds && branchIds.length === 0) {
    return NextResponse.json(
      { error: "FORBIDDEN_BRANCH" },
      { status: 403 },
    );
  }

  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const ownerUserId = hasPermission(auth.session, "crm.view_all")
    ? url.searchParams.get("ownerUserId")
    : auth.session.user.id;

  const items = await listOperationalQueue({
    organizationId: auth.session.organization.id,
    queueId: queueRaw,
    branchIds,
    ownerUserId,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({
    organizationId: auth.session.organization.id,
    queueId: queueRaw,
    items,
  });
}

type OpsQueueAction =
  | {
      action: "claim";
      queueId: OpsQueueId;
      entityType: OpsEntityType;
      entityId: string;
      ttlMs?: number;
    }
  | { action: "heartbeat"; claimId: string; ttlMs?: number }
  | { action: "release"; claimId: string }
  | {
      action: "dispatch";
      leadId: string;
      candidateUserIds: string[];
    }
  | {
      action: "escalate_reassign";
      leadId: string;
      newOwnerUserId: string;
      reason: string;
    }
  | { action: "resolve_escalation"; escalationId: string };

/**
 * POST /admin/ops/queues — claim / heartbeat / release / dispatch / escalate.
 */
export async function POST(request: Request) {
  const auth = await requireOpsSessionJson();
  if (!auth.ok) return auth.response;

  let body: OpsQueueAction;
  try {
    body = (await request.json()) as OpsQueueAction;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const orgId = auth.session.organization.id;
  const userId = auth.session.user.id;

  if (body.action === "claim") {
    if (!isOpsQueueId(body.queueId)) {
      return NextResponse.json({ error: "INVALID_QUEUE" }, { status: 400 });
    }
    if (
      body.entityType !== "LEAD" &&
      body.entityType !== "CRM_TASK" &&
      body.entityType !== "REGISTRATION"
    ) {
      return NextResponse.json({ error: "INVALID_ENTITY" }, { status: 400 });
    }
    const authz = await authorizeClaimableEntity({
      session: auth.session,
      organizationId: orgId,
      entityType: body.entityType,
      entityId: body.entityId,
    });
    if (!authz.ok) {
      return NextResponse.json(
        { error: authz.code, message: authz.error },
        { status: authz.code === "NOT_FOUND" ? 404 : 403 },
      );
    }
    const result = await claimQueueItem({
      organizationId: orgId,
      queueId: body.queueId,
      entityType: body.entityType,
      entityId: body.entityId,
      claimedByUserId: userId,
      ttlMs: clampClaimTtlMs(body.ttlMs),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.code, message: result.error },
        { status: result.code === "ALREADY_CLAIMED" ? 409 : 400 },
      );
    }
    return NextResponse.json({
      claimId: result.claimId,
      expiresAt: result.expiresAt.toISOString(),
    });
  }

  if (body.action === "heartbeat") {
    const result = await heartbeatQueueClaim({
      organizationId: orgId,
      claimId: body.claimId,
      claimedByUserId: userId,
      ttlMs: clampClaimTtlMs(body.ttlMs),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "CLAIM_NOT_FOUND", message: result.error },
        { status: 404 },
      );
    }
    return NextResponse.json({ expiresAt: result.expiresAt.toISOString() });
  }

  if (body.action === "release") {
    const result = await releaseQueueClaim({
      organizationId: orgId,
      claimId: body.claimId,
      claimedByUserId: userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "CLAIM_NOT_FOUND", message: result.error },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "dispatch") {
    if (!hasPermission(auth.session, "crm.assign")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const result = await dispatchLeadAssignment({
      organizationId: orgId,
      leadId: body.leadId,
      candidateUserIds: body.candidateUserIds ?? [],
      actorUserId: userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "DISPATCH_FAILED", message: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  if (body.action === "escalate_reassign") {
    if (!hasPermission(auth.session, "crm.assign")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const result = await escalateAndReassign({
      organizationId: orgId,
      leadId: body.leadId,
      reason: body.reason,
      newOwnerUserId: body.newOwnerUserId,
      actorUserId: userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "ESCALATE_FAILED", message: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  if (body.action === "resolve_escalation") {
    if (!hasPermission(auth.session, "crm.view_all")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const result = await resolveEscalation({
      organizationId: orgId,
      escalationId: body.escalationId,
      resolvedByUserId: userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "RESOLVE_FAILED", message: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
