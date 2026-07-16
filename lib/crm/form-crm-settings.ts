/**
 * FormVersion.settings.crm contract for form → lead behavior.
 */

export type FormCrmSettings = {
  createLeadOnSubmit: boolean;
  pipelineId: string | null;
  initialStageId: string | null;
  assignToUserId: string | null;
  createInitialTask: boolean;
  initialTaskTitle: string;
  initialTaskDueMinutes: number;
  leadSourceLabel: string;
  applyLeadScoring: boolean;
  enqueueConfirmationCommunication: boolean;
};

const DEFAULTS: FormCrmSettings = {
  createLeadOnSubmit: false,
  pipelineId: null,
  initialStageId: null,
  assignToUserId: null,
  createInitialTask: true,
  initialTaskTitle: "تماس اولیه با متقاضی",
  initialTaskDueMinutes: 60,
  leadSourceLabel: "FORM_SUBMISSION",
  applyLeadScoring: true,
  enqueueConfirmationCommunication: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFormCrmSettings(
  raw: unknown,
  formVersionFlags?: { createLeadOnSubmit?: boolean; leadSource?: string | null },
): FormCrmSettings {
  const base = { ...DEFAULTS };
  if (formVersionFlags?.createLeadOnSubmit === true) {
    base.createLeadOnSubmit = true;
  }
  if (formVersionFlags?.leadSource?.trim()) {
    base.leadSourceLabel = formVersionFlags.leadSource.trim();
  }

  if (!isRecord(raw)) return base;
  const crm = isRecord(raw.crm) ? raw.crm : null;
  if (!crm) return base;

  return {
    createLeadOnSubmit:
      crm.createLeadOnSubmit === true || base.createLeadOnSubmit,
    pipelineId:
      typeof crm.pipelineId === "string" && crm.pipelineId.trim()
        ? crm.pipelineId.trim()
        : null,
    initialStageId:
      typeof crm.initialStageId === "string" && crm.initialStageId.trim()
        ? crm.initialStageId.trim()
        : null,
    assignToUserId:
      typeof crm.assignToUserId === "string" && crm.assignToUserId.trim()
        ? crm.assignToUserId.trim()
        : null,
    createInitialTask: crm.createInitialTask !== false,
    initialTaskTitle:
      typeof crm.initialTaskTitle === "string" && crm.initialTaskTitle.trim()
        ? crm.initialTaskTitle.trim()
        : DEFAULTS.initialTaskTitle,
    initialTaskDueMinutes:
      typeof crm.initialTaskDueMinutes === "number" &&
      crm.initialTaskDueMinutes > 0
        ? Math.min(crm.initialTaskDueMinutes, 60 * 24 * 14)
        : DEFAULTS.initialTaskDueMinutes,
    leadSourceLabel:
      typeof crm.leadSourceLabel === "string" && crm.leadSourceLabel.trim()
        ? crm.leadSourceLabel.trim()
        : base.leadSourceLabel,
    applyLeadScoring: crm.applyLeadScoring !== false,
    enqueueConfirmationCommunication:
      crm.enqueueConfirmationCommunication === true,
  };
}
