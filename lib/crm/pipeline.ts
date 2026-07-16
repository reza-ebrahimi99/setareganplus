/**
 * Default admissions pipeline + LeadStatus ↔ CrmStageType mapping.
 */

import { CrmStageType, LeadStatus } from "@/generated/prisma/enums";
import { MembershipStatus } from "@/generated/prisma/enums";
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
  { code: "new", name: "جدید", stageType: CrmStageType.NEW, position: 0, isTerminal: false, isWon: false, isLost: false, colorKey: "slate" },
  { code: "contacted", name: "تماس گرفته‌شده", stageType: CrmStageType.CONTACTED, position: 1, isTerminal: false, isWon: false, isLost: false, colorKey: "blue" },
  { code: "qualified", name: "واجد شرایط", stageType: CrmStageType.QUALIFIED, position: 2, isTerminal: false, isWon: false, isLost: false, colorKey: "cyan" },
  { code: "consultation", name: "مشاوره", stageType: CrmStageType.CONSULTATION, position: 3, isTerminal: false, isWon: false, isLost: false, colorKey: "violet" },
  { code: "assessment", name: "ارزیابی", stageType: CrmStageType.ASSESSMENT, position: 4, isTerminal: false, isWon: false, isLost: false, colorKey: "amber" },
  { code: "decision", name: "تصمیم", stageType: CrmStageType.DECISION, position: 5, isTerminal: false, isWon: false, isLost: false, colorKey: "orange" },
  { code: "won", name: "ثبت‌نام‌شده", stageType: CrmStageType.WON, position: 6, isTerminal: true, isWon: true, isLost: false, colorKey: "green" },
  { code: "lost", name: "از دست‌رفته", stageType: CrmStageType.LOST, position: 7, isTerminal: true, isWon: false, isLost: true, colorKey: "red" },
];

/** Map pipeline stage type → legacy LeadStatus for compatibility. */
export function stageTypeToLeadStatus(stageType: CrmStageType): LeadStatus {
  switch (stageType) {
    case CrmStageType.NEW:
      return LeadStatus.NEW;
    case CrmStageType.CONTACTED:
      return LeadStatus.CONTACTED;
    case CrmStageType.QUALIFIED:
      return LeadStatus.WAITING_FOR_DECISION;
    case CrmStageType.CONSULTATION:
      return LeadStatus.CONSULTATION_SCHEDULED;
    case CrmStageType.ASSESSMENT:
      return LeadStatus.WAITING_FOR_DECISION;
    case CrmStageType.DECISION:
      return LeadStatus.WAITING_FOR_PAYMENT;
    case CrmStageType.WON:
      return LeadStatus.ENROLLED;
    case CrmStageType.LOST:
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
  let pipeline = await prisma.crmPipeline.findFirst({
    where: {
      organizationId,
      code: DEFAULT_PIPELINE_CODE,
      deletedAt: null,
    },
    include: {
      stages: {
        where: { deletedAt: null },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!pipeline) {
    pipeline = await prisma.crmPipeline.create({
      data: {
        organizationId,
        name: "پذیرش و ثبت‌نام",
        code: DEFAULT_PIPELINE_CODE,
        isDefault: true,
        isActive: true,
        stages: {
          create: DEFAULT_STAGES.map((s) => ({
            organizationId,
            name: s.name,
            code: s.code,
            colorKey: s.colorKey,
            position: s.position,
            stageType: s.stageType,
            isTerminal: s.isTerminal,
            isWon: s.isWon,
            isLost: s.isLost,
          })),
        },
      },
      include: {
        stages: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
      },
    });
  } else if (pipeline.stages.length === 0) {
    await prisma.crmPipelineStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({
        organizationId,
        pipelineId: pipeline!.id,
        name: s.name,
        code: s.code,
        colorKey: s.colorKey,
        position: s.position,
        stageType: s.stageType,
        isTerminal: s.isTerminal,
        isWon: s.isWon,
        isLost: s.isLost,
      })),
    });
    pipeline = await prisma.crmPipeline.findFirstOrThrow({
      where: { id: pipeline.id },
      include: {
        stages: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
      },
    });
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
