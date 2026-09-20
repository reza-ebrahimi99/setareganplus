import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";

export type CounselorV2StepEmbed = {
  studentId: string;
  formAction: (
    prev: JourneyV2FormState,
    formData: FormData,
  ) => Promise<JourneyV2FormState>;
};
