import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

export type GuidanceStepFormAction = (
  state: GuidanceStepFormState,
  formData: FormData,
) => Promise<GuidanceStepFormState>;

export type GuidanceStepEmbedProps = {
  embed?: boolean;
  stayOnSuccess?: boolean;
  continueLabel?: string;
  formAction?: GuidanceStepFormAction;
  hiddenFields?: Record<string, string>;
};
