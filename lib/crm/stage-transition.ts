import type { CrmStageType } from "@/generated/prisma/enums";

export type TerminalStageStatus = "WON" | "LOST";

export function terminalStatusForStage(stage: {
  isTerminal: boolean;
  stageType: CrmStageType;
}): TerminalStageStatus | null {
  if (!stage.isTerminal) return null;
  if (stage.stageType === "WON" || stage.stageType === "LOST") {
    return stage.stageType;
  }
  return null;
}

export function evaluateTerminalConfirmation(
  stage: { isTerminal: boolean; stageType: CrmStageType },
  confirmed: boolean,
):
  | { ok: true; terminalStatus: TerminalStageStatus | null }
  | {
      ok: false;
      requiresConfirmation: true;
      terminalStatus: TerminalStageStatus;
    }
  | { ok: false; requiresConfirmation: false; error: string } {
  const terminalStatus = terminalStatusForStage(stage);
  if (stage.isTerminal && !terminalStatus) {
    return {
      ok: false,
      requiresConfirmation: false,
      error: "مرحله پایانی انتخاب‌شده معتبر نیست.",
    };
  }
  if (terminalStatus && !confirmed) {
    return { ok: false, requiresConfirmation: true, terminalStatus };
  }
  return { ok: true, terminalStatus };
}
