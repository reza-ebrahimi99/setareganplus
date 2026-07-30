import type { Prisma } from "@/generated/prisma/client";
import { AutomationExecutionStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function appendAutomationActionLog(params: {
  organizationId: string;
  automationExecutionId: string;
  actionIndex: number;
  actionType: string;
  status: AutomationExecutionStatus;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorCode?: string;
}): Promise<void> {
  await prisma.automationActionLog.create({
    data: {
      organizationId: params.organizationId,
      automationExecutionId: params.automationExecutionId,
      actionIndex: params.actionIndex,
      actionType: params.actionType,
      status: params.status,
      inputSummary: (params.inputSummary ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      outputSummary: (params.outputSummary ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      errorCode: params.errorCode,
    },
  });
}
