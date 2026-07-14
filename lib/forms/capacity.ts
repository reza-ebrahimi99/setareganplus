import {
  FormSubmissionStatus,
  type FormSubmissionStatus as FormSubmissionStatusValue,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Statuses that consume registration capacity.
 * - RECEIVED: normal accepted submission
 * - DUPLICATE: accepted under FLAG_AND_ACCEPT (still occupies a seat)
 *
 * Do NOT count:
 * - WAITING_LIST (overflow / waitlist — not a confirmed seat)
 * - REJECTED (invalid / rejected registration)
 */
export const CAPACITY_CONSUMING_STATUSES: ReadonlyArray<FormSubmissionStatusValue> =
  [FormSubmissionStatus.RECEIVED, FormSubmissionStatus.DUPLICATE];

export const CAPACITY_MAX = 1_000_000;

export async function countCapacityUsed(params: {
  organizationId: string;
  formId: string;
  formVersionId: string;
  /** Optional transaction client with the same count API as prisma.formSubmission */
  tx?: {
    formSubmission: {
      count: (args: {
        where: Record<string, unknown>;
      }) => Promise<number>;
    };
  };
}): Promise<number> {
  const client = params.tx ?? prisma;
  return client.formSubmission.count({
    where: {
      organizationId: params.organizationId,
      formId: params.formId,
      formVersionId: params.formVersionId,
      deletedAt: null,
      status: { in: [...CAPACITY_CONSUMING_STATUSES] },
    },
  });
}

/**
 * Session-scoped advisory lock for this form version during capacity writes.
 * Preferable when Serializable isolation via Prisma adapter is not confirmed.
 * Lock releases automatically at transaction end.
 */
export async function lockFormVersionCapacity(
  tx: {
    $executeRaw: (
      query: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<unknown>;
  },
  formVersionId: string,
): Promise<void> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${formVersionId}))
  `;
}

export type CapacityCheckResult =
  | { ok: true; used: number; remaining: number | null }
  | { ok: false; used: number };

export async function assertCapacityAvailable(
  tx: {
    formSubmission: {
      count: (args: {
        where: Record<string, unknown>;
      }) => Promise<number>;
    };
  },
  params: {
    organizationId: string;
    formId: string;
    formVersionId: string;
    capacity: number | null;
  },
): Promise<CapacityCheckResult> {
  const used = await countCapacityUsed({ ...params, tx });
  if (params.capacity == null) {
    return { ok: true, used, remaining: null };
  }
  if (used >= params.capacity) {
    return { ok: false, used };
  }
  return {
    ok: true,
    used,
    remaining: Math.max(0, params.capacity - used),
  };
}
