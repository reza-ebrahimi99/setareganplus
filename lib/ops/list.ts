/**
 * Unified queue list + claim annotations.
 */

import { getActiveClaimMap } from "@/lib/ops/claims";
import { sortQueueItems } from "@/lib/ops/priority";
import { listAssignmentQueue } from "@/lib/ops/queues/assignment";
import { listCallQueue } from "@/lib/ops/queues/call";
import { listEscalationQueue } from "@/lib/ops/queues/escalation-queue";
import { listFollowUpQueue } from "@/lib/ops/queues/follow-up";
import { listSlaQueue } from "@/lib/ops/queues/sla";
import type {
  OperationalQueueItem,
  OpsQueueId,
  OpsQueueListQuery,
} from "@/lib/ops/types";

export async function listOperationalQueue(
  query: OpsQueueListQuery,
): Promise<OperationalQueueItem[]> {
  let items: OperationalQueueItem[];
  switch (query.queueId) {
    case "ASSIGNMENT":
      items = await listAssignmentQueue(query);
      break;
    case "FOLLOW_UP":
      items = await listFollowUpQueue(query);
      break;
    case "CALL":
      items = await listCallQueue(query);
      break;
    case "SLA":
      items = await listSlaQueue(query);
      break;
    case "ESCALATION":
      items = await listEscalationQueue(query);
      break;
    default: {
      const _exhaustive: never = query.queueId;
      throw new Error(`Unknown queue: ${_exhaustive}`);
    }
  }

  const claims = await getActiveClaimMap({
    organizationId: query.organizationId,
    queueId: query.queueId,
  });

  const annotated = items.map((item) => {
    const claim = claims.get(`${item.entityType}:${item.entityId}`);
    if (!claim) return item;
    return {
      ...item,
      metadata: {
        ...item.metadata,
        claimedByUserId: claim.claimedByUserId,
        claimExpiresAt: claim.expiresAt.toISOString(),
      },
    };
  });

  return sortQueueItems(annotated);
}

export function isOpsQueueId(value: string): value is OpsQueueId {
  return (
    value === "ASSIGNMENT" ||
    value === "FOLLOW_UP" ||
    value === "CALL" ||
    value === "SLA" ||
    value === "ESCALATION"
  );
}
