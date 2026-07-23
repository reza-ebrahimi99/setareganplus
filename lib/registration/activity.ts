import type { Prisma } from "@/generated/prisma/client";
import { RegistrationActivityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function recordRegistrationActivity(params: {
  organizationId: string;
  registrationId: string;
  activityType: RegistrationActivityType;
  title: string;
  summary?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}): Promise<void> {
  const client = params.tx ?? prisma;
  await client.registrationActivity.create({
    data: {
      organizationId: params.organizationId,
      registrationId: params.registrationId,
      activityType: params.activityType,
      title: params.title.trim(),
      summary: params.summary?.trim() || null,
      actorUserId: params.actorUserId ?? null,
      metadata: (params.metadata ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
}
