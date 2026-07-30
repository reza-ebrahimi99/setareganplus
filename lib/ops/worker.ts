/**
 * Ops SLA evaluation hooked into existing CRM scheduled worker.
 * Sprint 5: emits SLA_BREACHED; opens escalations unless clock cutover is on.
 */

import { DomainEventType } from "@/generated/prisma/enums";
import { isAutomationClockCutoverEnabled } from "@/lib/automation/cutover";
import { enqueueDomainEvent } from "@/lib/automation/enqueue";
import { expireStaleClaims } from "@/lib/ops/claims";
import { openEscalation } from "@/lib/ops/escalation";
import { listSlaQueue } from "@/lib/ops/queues/sla";
import { prisma } from "@/lib/prisma";

/**
 * Emit SLA_BREACHED for breached items.
 * Phase C (default): emit only. Dual-run when STAROS_AUTOMATION_CLOCK_CUTOVER=0.
 */
export async function processOpsSlaEscalations(
  organizationId?: string,
): Promise<number> {
  const cutover = isAutomationClockCutoverEnabled();
  const orgIds = organizationId
    ? [organizationId]
    : (
        await prisma.organization.findMany({
          where: { deletedAt: null, isActive: true },
          select: { id: true },
          take: 100,
        })
      ).map((o) => o.id);

  let opened = 0;
  for (const orgId of orgIds) {
    await expireStaleClaims(orgId);
    const breached = await listSlaQueue({
      organizationId: orgId,
      queueId: "SLA",
      limit: 50,
    });
    for (const item of breached) {
      if (item.slaState !== "BREACHED") continue;
      const leadId =
        item.entityType === "LEAD"
          ? item.entityId
          : typeof item.metadata.leadId === "string"
            ? item.metadata.leadId
            : null;

      await enqueueDomainEvent({
        organizationId: orgId,
        eventType: DomainEventType.SLA_BREACHED,
        aggregateType:
          item.entityType === "LEAD"
            ? "Lead"
            : item.entityType === "CRM_TASK"
              ? "CrmTask"
              : "Registration",
        aggregateId: item.entityId,
        dedupeKey: `SLA_BREACHED:${item.entityType}:${item.entityId}:${String(item.metadata.clock ?? "UNKNOWN")}`,
        payload: {
          leadId,
          entityType: item.entityType,
          entityId: item.entityId,
          slaState: item.slaState,
          dueAt: item.dueAt,
          queueId: item.queueId,
          clock: item.metadata.clock ?? null,
          priority: item.priority,
        },
      }).catch(() => undefined);

      if (cutover) {
        opened += 1;
        continue;
      }

      const result = await openEscalation({
        organizationId: orgId,
        entityType: item.entityType,
        entityId: item.entityId,
        leadId,
        queueId: "SLA",
        reason: `SLA_BREACH:${String(item.metadata.clock ?? "UNKNOWN")}`,
        metadata: { ...item.metadata, dueAt: item.dueAt },
      });
      if (result.created) opened += 1;
    }
  }
  return opened;
}
