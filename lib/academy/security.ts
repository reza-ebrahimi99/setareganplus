import type { Prisma } from "@/generated/prisma/client";
import type { AcademySecurityEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function logAcademySecurityEvent(params: {
  organizationId: string;
  userId?: string | null;
  type: AcademySecurityEventType;
  lessonId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.academySecurityEvent.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      type: params.type,
      lessonId: params.lessonId ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
