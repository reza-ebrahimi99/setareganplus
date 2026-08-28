/**
 * Maps RegistrationFlowStep (admin) → public wizard panels.
 * Only enabled steps participate in UI, navigation, validation, and progress.
 */

import {
  RegistrationFlowStepKey,
  RegistrationProductType,
  type RegistrationFlowStepKey as RegistrationFlowStepKeyValue,
  type RegistrationProductType as RegistrationProductTypeValue,
} from "@/generated/prisma/enums";
import {
  DEFAULT_FLOW_STEPS,
  FLOW_STEP_LABELS,
} from "@/lib/registration/flows/constants";

/** In-wizard panels (CONFIRMATION is post-submit / receipt — not a wizard page). */
export type WizardPanelKey =
  | "STUDENT"
  | "APPLICANT"
  | "FORM"
  | "DOCUMENTS"
  | "REVIEW"
  | "PAYMENT";

export type WizardPlanStep = {
  /** 1-based index within the active plan only */
  index: number;
  panel: WizardPanelKey;
  stepKey: RegistrationFlowStepKeyValue;
  label: string;
};

export type WizardPlan = {
  steps: WizardPlanStep[];
  totalSteps: number;
  has: (panel: WizardPanelKey) => boolean;
  panelAt: (index: number) => WizardPlanStep | null;
  indexOf: (panel: WizardPanelKey) => number | null;
};

export type FlowStepLike = {
  stepKey: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
};

const PANEL_FOR_STEP: Partial<
  Record<RegistrationFlowStepKeyValue, WizardPanelKey>
> = {
  [RegistrationFlowStepKey.STUDENT]: "STUDENT",
  [RegistrationFlowStepKey.APPLICANT]: "APPLICANT",
  [RegistrationFlowStepKey.FORM]: "FORM",
  [RegistrationFlowStepKey.DOCUMENTS]: "DOCUMENTS",
  [RegistrationFlowStepKey.REVIEW]: "REVIEW",
  [RegistrationFlowStepKey.PAYMENT]: "PAYMENT",
  // CONFIRMATION → receipt / post-submit; no wizard page
};

/** Legacy hardcoded wizard (catalog-only flows without RegistrationFlow rows). */
export const LEGACY_WIZARD_PANELS: ReadonlyArray<{
  panel: WizardPanelKey;
  label: string;
}> = [
  { panel: "STUDENT", label: "اطلاعات دانش‌آموز" },
  { panel: "APPLICANT", label: "اطلاعات ولی" },
  { panel: "FORM", label: "جزئیات ثبت‌نام" },
  { panel: "DOCUMENTS", label: "مدارک" },
  { panel: "REVIEW", label: "بازبینی" },
  { panel: "PAYMENT", label: "پرداخت" },
];

/**
 * Product types that default to commerce-style short flows
 * (no guardian/student/documents required by default).
 */
export function isCommerceLiteProductType(
  productType: RegistrationProductTypeValue | string,
): boolean {
  return (
    productType === RegistrationProductType.BOOK ||
    productType === RegistrationProductType.WORKBOOK ||
    productType === RegistrationProductType.DIGITAL_PRODUCT ||
    productType === RegistrationProductType.SCHOOL_SUPPLIES ||
    productType === RegistrationProductType.SCHOOL_UNIFORM ||
    productType === RegistrationProductType.CERTIFICATE
  );
}

export function defaultStepEnabledForProductType(
  stepKey: RegistrationFlowStepKeyValue,
  productType: RegistrationProductTypeValue,
): boolean {
  if (!isCommerceLiteProductType(productType)) {
    return true;
  }
  switch (stepKey) {
    case RegistrationFlowStepKey.APPLICANT:
    case RegistrationFlowStepKey.STUDENT:
    case RegistrationFlowStepKey.DOCUMENTS:
      return false;
    case RegistrationFlowStepKey.FORM:
    case RegistrationFlowStepKey.PAYMENT:
    case RegistrationFlowStepKey.REVIEW:
    case RegistrationFlowStepKey.CONFIRMATION:
      return true;
    default:
      return true;
  }
}

export function defaultFlowStepsForProductType(
  productType: RegistrationProductTypeValue,
): ReadonlyArray<{
  stepKey: RegistrationFlowStepKeyValue;
  label: string;
  enabled: boolean;
  sortOrder: number;
}> {
  return DEFAULT_FLOW_STEPS.map((step) => ({
    ...step,
    enabled: defaultStepEnabledForProductType(step.stepKey, productType),
  }));
}

function isStepKey(value: string): value is RegistrationFlowStepKeyValue {
  return Object.values(RegistrationFlowStepKey).includes(
    value as RegistrationFlowStepKeyValue,
  );
}

/**
 * Build the public wizard plan from DB flow steps (enabled only).
 * Falls back to legacy 6-step plan when no steps are provided.
 */
export function buildWizardPlan(
  flowSteps: FlowStepLike[] | null | undefined,
  options?: { formDriven?: boolean },
): WizardPlan {
  const formDriven = Boolean(options?.formDriven);

  if (!flowSteps || flowSteps.length === 0) {
    const steps: WizardPlanStep[] = LEGACY_WIZARD_PANELS.map((item, index) => ({
      index: index + 1,
      panel: item.panel,
      stepKey:
        item.panel === "APPLICANT"
          ? RegistrationFlowStepKey.APPLICANT
          : item.panel === "STUDENT"
            ? RegistrationFlowStepKey.STUDENT
            : item.panel === "FORM"
              ? RegistrationFlowStepKey.FORM
              : item.panel === "DOCUMENTS"
                ? RegistrationFlowStepKey.DOCUMENTS
                : item.panel === "REVIEW"
                  ? RegistrationFlowStepKey.REVIEW
                  : RegistrationFlowStepKey.PAYMENT,
      label:
        formDriven && item.panel === "FORM" ? "فرم تکمیلی" : item.label,
    }));
    return makePlan(steps);
  }

  const enabled = flowSteps
    .filter((step) => step.enabled)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.stepKey.localeCompare(b.stepKey));

  const steps: WizardPlanStep[] = [];
  const seenPanels = new Set<WizardPanelKey>();

  for (const step of enabled) {
    if (!isStepKey(step.stepKey)) continue;
    if (step.stepKey === RegistrationFlowStepKey.CONFIRMATION) continue;
    const panel = PANEL_FOR_STEP[step.stepKey];
    if (!panel || seenPanels.has(panel)) continue;
    seenPanels.add(panel);
    steps.push({
      index: steps.length + 1,
      panel,
      stepKey: step.stepKey,
      label:
        step.label.trim() ||
        FLOW_STEP_LABELS[step.stepKey] ||
        step.stepKey,
    });
  }

  // Safety: never produce an empty wizard — fall back to FORM+PAYMENT+REVIEW
  if (steps.length === 0) {
    return buildWizardPlan(
      [
        {
          stepKey: RegistrationFlowStepKey.FORM,
          label: formDriven ? "فرم تکمیلی" : "جزئیات ثبت‌نام",
          enabled: true,
          sortOrder: 0,
        },
        {
          stepKey: RegistrationFlowStepKey.REVIEW,
          label: FLOW_STEP_LABELS.REVIEW,
          enabled: true,
          sortOrder: 1,
        },
        {
          stepKey: RegistrationFlowStepKey.PAYMENT,
          label: FLOW_STEP_LABELS.PAYMENT,
          enabled: true,
          sortOrder: 2,
        },
      ],
      options,
    );
  }

  if (formDriven) {
    for (const step of steps) {
      if (step.panel === "FORM" && (!step.label || step.label === FLOW_STEP_LABELS.FORM)) {
        step.label = "فرم تکمیلی";
      }
    }
  }

  return makePlan(steps);
}

function makePlan(steps: WizardPlanStep[]): WizardPlan {
  const byPanel = new Map(steps.map((step) => [step.panel, step]));
  return {
    steps,
    totalSteps: steps.length,
    has: (panel) => byPanel.has(panel),
    panelAt: (index) => steps.find((step) => step.index === index) ?? null,
    indexOf: (panel) => byPanel.get(panel)?.index ?? null,
  };
}
