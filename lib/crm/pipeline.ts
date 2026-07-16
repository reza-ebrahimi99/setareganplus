/**
 * Default admissions pipeline + LeadStatus ↔ CrmStageType mapping.
 *
 * Runtime enums must come from `@/generated/prisma/enums` (value import, not `import type`).
 * DEFAULT_STAGES uses string literals so module init does not crash if generate is stale;
 * values remain assignable to CrmStageType after `prisma generate`.
 */

import {
  CrmStageType,
  LeadStatus,
  MembershipStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const DEFAULT_PIPELINE_CODE = "admissions" as const;

export const DEFAULT_STAGES: ReadonlyArray<{
  code: string;
  name: string;
  stageType: CrmStageType;
  position: number;
  isTerminal: boolean;
  isWon: boolean;
  isLost: boolean;
  colorKey: string;
}> = [
  { code: "new", name: "جدید", stageType: "NEW", position: 0, isTerminal: false, isWon: false, isLost: false, colorKey: "slate" },
  { code: "contacted", name: "تماس گرفته‌شده", stageType: "CONTACTED", position: 1, isTerminal: false, isWon: false, isLost: false, colorKey: "blue" },
  { code: "qualified", name: "واجد شرایط", stageType: "QUALIFIED", position: 2, isTerminal: false, isWon: false, isLost: false, colorKey: "cyan" },
  { code: "consultation", name: "مشاوره", stageType: "CONSULTATION", position: 3, isTerminal: false, isWon: false, isLost: false, colorKey: "violet" },
  { code: "assessment", name: "ارزیابی", stageType: "ASSESSMENT", position: 4, isTerminal: false, isWon: false, isLost: false, colorKey: "amber" },
  { code: "decision", name: "تصمیم", stageType: "DECISION", position: 5, isTerminal: false, isWon: false, isLost: false, colorKey: "orange" },
  { code: "won", name: "ثبت‌نام‌شده", stageType: "WON", position: 6, isTerminal: true, isWon: true, isLost: false, colorKey: "green" },
  { code: "lost", name: "از دست‌رفته", stageType: "LOST", position: 7, isTerminal: true, isWon: false, isLost: true, colorKey: "red" },
];

/** Map pipeline stage type → legacy LeadStatus for compatibility. */
export function stageTypeToLeadStatus(stageType: CrmStageType): LeadStatus {
  switch (stageType) {
    case "NEW":
      return LeadStatus.NEW;
    case "CONTACTED":
      return LeadStatus.CONTACTED;
    case "QUALIFIED":
      return LeadStatus.WAITING_FOR_DECISION;
    case "CONSULTATION":
      return LeadStatus.CONSULTATION_SCHEDULED;
    case "ASSESSMENT":
      return LeadStatus.WAITING_FOR_DECISION;
    case "DECISION":
      return LeadStatus.WAITING_FOR_PAYMENT;
    case "WON":
      return LeadStatus.ENROLLED;
    case "LOST":
      return LeadStatus.LOST;
    default:
      return LeadStatus.NEW;
  }
}

export async function ensureDefaultPipeline(organizationId: string): Promise<{
  pipelineId: string;
  stageByCode: Record<string, string>;
  newStageId: string;
  consultationStageId: string;
}> {
  // Upsert by the tenant-scoped unique key avoids a find/create race. Use the
  // checked relation input here: CrmPipelineCreateInput expects `organization`,
  // while CrmPipelineUncheckedCreateInput is the variant that accepts
  // `organizationId`.
  let pipeline = await prisma.crmPipeline.upsert({
    where: {
      organizationId_code: {
        organizationId,
        code: DEFAULT_PIPELINE_CODE,
      },
    },
    update: {
      deletedAt: null,
      isActive: true,
      isDefault: true,
    },
    create: {
      organization: {
        connect: { id: organizationId },
      },
      name: "پذیرش و ثبت‌نام",
      code: DEFAULT_PIPELINE_CODE,
      isDefault: true,
      isActive: true,
    },
    include: {
      stages: {
        where: { deletedAt: null },
        orderBy: { position: "asc" },
      },
    },
  });

  // Fill missing default stages and restore soft-deleted defaults. Nested
  // `stages.create` cannot accept organizationId for this composite relation,
  // so each stage uses checked relation connects. Existing stage positions are
  // intentionally preserved because ordering is admin-managed.
  await prisma.$transaction(
    DEFAULT_STAGES.map((stage) =>
      prisma.crmPipelineStage.upsert({
        where: {
          organizationId_pipelineId_code: {
            organizationId,
            pipelineId: pipeline.id,
            code: stage.code,
          },
        },
        update: {
          deletedAt: null,
          name: stage.name,
          colorKey: stage.colorKey,
          stageType: stage.stageType,
          isTerminal: stage.isTerminal,
          isWon: stage.isWon,
          isLost: stage.isLost,
        },
        create: {
          organization: {
            connect: { id: organizationId },
          },
          pipeline: {
            connect: {
              organizationId_id: {
                organizationId,
                id: pipeline.id,
              },
            },
          },
          name: stage.name,
          code: stage.code,
          colorKey: stage.colorKey,
          position: stage.position,
          stageType: stage.stageType,
          isTerminal: stage.isTerminal,
          isWon: stage.isWon,
          isLost: stage.isLost,
        },
      }),
    ),
  );

  pipeline = await prisma.crmPipeline.findFirstOrThrow({
    where: { id: pipeline.id, organizationId, deletedAt: null },
    include: {
      stages: {
        where: { deletedAt: null },
        orderBy: { position: "asc" },
      },
    },
  });

  if (pipeline.stages.length === 0) {
    throw new Error(
      `Default CRM pipeline ${pipeline.id} has no active stages after initialization.`,
    );
  }

  const stageByCode: Record<string, string> = {};
  for (const stage of pipeline.stages) {
    stageByCode[stage.code] = stage.id;
  }

  return {
    pipelineId: pipeline.id,
    stageByCode,
    newStageId: stageByCode.new ?? pipeline.stages[0]!.id,
    consultationStageId:
      stageByCode.consultation ?? stageByCode.new ?? pipeline.stages[0]!.id,
  };
}

export async function assertStageInOrg(params: {
  organizationId: string;
  stageId: string;
  pipelineId?: string | null;
}): Promise<{
  id: string;
  pipelineId: string;
  stageType: CrmStageType;
  isTerminal: boolean;
  isWon: boolean;
  isLost: boolean;
  name: string;
} | null> {
  const stage = await prisma.crmPipelineStage.findFirst({
    where: {
      id: params.stageId,
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.pipelineId ? { pipelineId: params.pipelineId } : {}),
    },
    select: {
      id: true,
      pipelineId: true,
      stageType: true,
      isTerminal: true,
      isWon: true,
      isLost: true,
      name: true,
    },
  });
  return stage;
}

export async function assertOwnerInOrg(params: {
  organizationId: string;
  userId: string;
}): Promise<boolean> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
    },
    select: { id: true },
  });
  return Boolean(membership);
}
