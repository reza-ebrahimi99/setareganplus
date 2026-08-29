/**
 * Prevent automation reassignment feedback loops (Sprint 6.6).
 */

import { DomainEventType } from "@/generated/prisma/enums";
import {
  AUTOMATION_CIRCUIT_TRIP_LIMIT,
  AUTOMATION_CIRCUIT_WINDOW_MS,
  AUTOMATION_REASSIGN_RATE_LIMIT,
  AUTOMATION_REASSIGN_RATE_WINDOW_MS,
} from "@/lib/automation/types";
import { prisma } from "@/lib/prisma";

const OWNERSHIP_MUTATING_ACTIONS = new Set([
  "ASSIGN_OWNER",
  "DISPATCH_OWNER",
  "ESCALATE_REASSIGN",
]);

const ASSIGN_EVENT_TYPES = [
  DomainEventType.LEAD_REASSIGNED,
  DomainEventType.LEAD_ASSIGNED,
] as const;

export function isOwnershipMutatingAction(actionType: string): boolean {
  return OWNERSHIP_MUTATING_ACTIONS.has(actionType);
}

/**
 * Block ownership mutations when the inbound event itself was caused by automation.
 */
export function isAutomationOwnershipEcho(params: {
  eventType: DomainEventType;
  eventPayload: Record<string, unknown>;
}): boolean {
  if (
    params.eventType !== DomainEventType.LEAD_ASSIGNED &&
    params.eventType !== DomainEventType.LEAD_REASSIGNED
  ) {
    return false;
  }
  const source =
    typeof params.eventPayload.ownershipSource === "string"
      ? params.eventPayload.ownershipSource
      : typeof params.eventPayload.source === "string"
        ? params.eventPayload.source
        : null;
  return source === "AUTOMATION";
}

async function countLeadAssignEvents(params: {
  organizationId: string;
  leadId: string;
  since: Date;
}): Promise<number> {
  return prisma.domainEventOutbox.count({
    where: {
      organizationId: params.organizationId,
      aggregateType: "Lead",
      aggregateId: params.leadId,
      eventType: { in: [...ASSIGN_EVENT_TYPES] },
      createdAt: { gte: params.since },
    },
  });
}

/**
 * Rate-limit rapid reassignment storms for one lead.
 */
export async function isLeadReassignmentRateLimited(params: {
  organizationId: string;
  leadId: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - AUTOMATION_REASSIGN_RATE_WINDOW_MS);
  const count = await countLeadAssignEvents({ ...params, since });
  return count >= AUTOMATION_REASSIGN_RATE_LIMIT;
}

/**
 * Circuit breaker — longer window / higher trip than the short rate limit.
 * Once open, ownership mutations for the lead are blocked until volume cools.
 */
export async function isLeadReassignmentCircuitOpen(params: {
  organizationId: string;
  leadId: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - AUTOMATION_CIRCUIT_WINDOW_MS);
  const count = await countLeadAssignEvents({ ...params, since });
  return count >= AUTOMATION_CIRCUIT_TRIP_LIMIT;
}

export async function assertOwnershipActionAllowed(params: {
  organizationId: string;
  eventType: DomainEventType;
  eventPayload: Record<string, unknown>;
  leadId: string | null;
  actionType: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  if (!isOwnershipMutatingAction(params.actionType)) {
    return { ok: true };
  }
  if (
    isAutomationOwnershipEcho({
      eventType: params.eventType,
      eventPayload: params.eventPayload,
    })
  ) {
    return {
      ok: false,
      code: "LOOP_AUTOMATION_ECHO",
      message: "Skipped ownership action on AUTOMATION-sourced assign event.",
    };
  }
  if (params.leadId) {
    const circuitOpen = await isLeadReassignmentCircuitOpen({
      organizationId: params.organizationId,
      leadId: params.leadId,
    });
    if (circuitOpen) {
      return {
        ok: false,
        code: "LOOP_CIRCUIT_OPEN",
        message: "Lead reassignment circuit breaker open.",
      };
    }
    const limited = await isLeadReassignmentRateLimited({
      organizationId: params.organizationId,
      leadId: params.leadId,
    });
    if (limited) {
      return {
        ok: false,
        code: "LOOP_RATE_LIMIT",
        message: "Lead reassignment rate limit exceeded.",
      };
    }
  }
  return { ok: true };
}
