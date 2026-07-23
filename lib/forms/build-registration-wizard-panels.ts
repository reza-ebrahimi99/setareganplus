import type { FormFieldType } from "@/generated/prisma/enums";

export type WizardSourceField = {
  id: string;
  formStepId: string | null;
  fieldKey: string;
  sortOrder: number;
  type: FormFieldType;
  label: string;
  helpText: string | null;
  placeholder: string | null;
  required: boolean;
  config: unknown;
  visibilityConditions: unknown;
};

export type WizardSourceStep = {
  id: string;
  stepKey: string;
  sortOrder: number;
  title: string;
  description: string | null;
};

export type RegistrationWizardPanel = {
  id: string;
  kind: "step" | "unassigned";
  title: string;
  description: string | null;
  fields: WizardSourceField[];
};

const UNASSIGNED_PANEL_ID = "__unassigned__";

/**
 * Builds public wizard panels from FormStep + FormField.
 * Empty steps are skipped. Unassigned fields become a final panel.
 */
export function buildRegistrationWizardPanels(
  steps: readonly WizardSourceStep[],
  fields: readonly WizardSourceField[],
): RegistrationWizardPanel[] {
  const orderedSteps = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const stepIdSet = new Set(orderedSteps.map((step) => step.id));
  const fieldsByStepId = new Map<string, WizardSourceField[]>();
  for (const step of orderedSteps) {
    fieldsByStepId.set(step.id, []);
  }

  const unassigned: WizardSourceField[] = [];
  const orderedFields = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const field of orderedFields) {
    if (field.formStepId && stepIdSet.has(field.formStepId)) {
      fieldsByStepId.get(field.formStepId)?.push(field);
    } else {
      unassigned.push(field);
    }
  }

  const panels: RegistrationWizardPanel[] = [];

  for (const step of orderedSteps) {
    const stepFields = fieldsByStepId.get(step.id) ?? [];
    if (stepFields.length === 0) {
      continue;
    }
    panels.push({
      id: step.id,
      kind: "step",
      title: step.title,
      description: step.description,
      fields: stepFields,
    });
  }

  if (unassigned.length > 0) {
    panels.push({
      id: UNASSIGNED_PANEL_ID,
      kind: "unassigned",
      title: "اطلاعات تکمیلی",
      description: "لطفاً موارد باقی‌مانده را تکمیل کنید.",
      fields: unassigned,
    });
  }

  if (panels.length === 0) {
    panels.push({
      id: UNASSIGNED_PANEL_ID,
      kind: "unassigned",
      title: "ثبت‌نام",
      description: null,
      fields: [],
    });
  }

  return panels;
}
