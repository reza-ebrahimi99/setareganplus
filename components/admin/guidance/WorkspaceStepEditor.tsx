import {
  counselorEditStep1Action,
  counselorEditStep2Action,
  counselorEditStep5Action,
  counselorEditStep6Action,
  counselorEditStep7Action,
  counselorEditStep8Action,
  counselorEditStep9Action,
} from "@/app/admin/(dashboard)/guidance/workspace-actions";
import { PersonalInfoStep } from "@/components/guidance/steps/step1/PersonalInfoStep";
import { InterestAssessmentStep } from "@/components/guidance/steps/step2/InterestAssessmentStep";
import { ExamResultsStep } from "@/components/guidance/steps/step5/ExamResultsStep";
import { EducationPreferencesStep } from "@/components/guidance/steps/step6/EducationPreferencesStep";
import { CityPreferencesStep } from "@/components/guidance/steps/step7/CityPreferencesStep";
import { MajorPreferencesStep } from "@/components/guidance/steps/step8/MajorPreferencesStep";
import { PriorityWeightsStep } from "@/components/guidance/steps/step9/PriorityWeightsStep";
import { loadStep1Prefill } from "@/lib/guidance/journey/steps/step1-personal-info";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { loadStep5Prefill } from "@/lib/guidance/journey/steps/step5-exam-results";
import { loadStep6Data } from "@/lib/guidance/journey/steps/step6-education-preferences";
import { loadStep7Data } from "@/lib/guidance/journey/steps/step7-city-preferences";
import { loadStep8Data } from "@/lib/guidance/journey/steps/step8-major-preferences";
import { loadStep9Data } from "@/lib/guidance/journey/steps/step9-priority-weights";
import { getMajorsForExamGroup } from "@/lib/guidance/journey/reference-data/majors";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import type { WorkspaceDocumentItem } from "@/lib/guidance/workspace";

const EMPTY_SIDEBAR: GuidanceJourneySidebarStep[] = [];

const EMBED = {
  embed: true as const,
  stayOnSuccess: true as const,
  continueLabel: "ثبت ویرایش مشاور",
};

export async function WorkspaceStepEditor({
  organizationId,
  publicId,
  stepId,
  studentName,
  examGroup,
  documents,
}: {
  organizationId: string;
  publicId: string;
  stepId: GuidanceJourneyStepId;
  studentName: string;
  examGroup: string;
  documents: readonly WorkspaceDocumentItem[];
}) {
  const hiddenFields = { publicId };
  const base = { organizationId, planPublicId: publicId };

  if (stepId === 1) {
    const prefill = await loadStep1Prefill(base);
    const transcript = documents.find((d) => d.documentType === "FINAL_GRADES" && d.isLatest);
    return (
      <PersonalInfoStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        fullName={studentName}
        examGroup={examGroup}
        hasTranscript={Boolean(transcript)}
        existingTranscriptName={transcript?.filename ?? null}
        provinces={IRAN_PROVINCES}
        prefill={{
          nationalId: prefill.nationalId ?? "",
          gender: prefill.gender ?? "",
          birthDate: prefill.birthDate ?? "",
          province: prefill.province ?? "",
        }}
        formAction={counselorEditStep1Action}
        hiddenFields={hiddenFields}
        {...EMBED}
      />
    );
  }

  if (stepId === 2) {
    const session = await loadGuidanceStep2Session(base);
    return (
      <InterestAssessmentStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialAnswers={session.answers}
        formAction={counselorEditStep2Action}
        hiddenFields={hiddenFields}
        {...EMBED}
      />
    );
  }

  if (stepId === 5) {
    const exam = await loadStep5Prefill(base);
    const file = documents.find((d) => d.documentType === "EXAM_RESULT" && d.isLatest);
    return (
      <ExamResultsStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        hasDocument={Boolean(file)}
        existingFileName={file?.filename ?? null}
        prefill={{
          nationalRank: exam ? String(exam.nationalRank) : "",
          regionalRank: exam ? String(exam.regionalRank) : "",
          quotaRank: exam?.quotaRank != null ? String(exam.quotaRank) : "",
          score: exam ? String(exam.score) : "",
        }}
        formAction={counselorEditStep5Action}
        hiddenFields={hiddenFields}
        {...EMBED}
      />
    );
  }

  if (stepId === 6) {
    const data = await loadStep6Data(base);
    return (
      <EducationPreferencesStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialItems={data.items}
        counselorSubmit={(items, reason) =>
          counselorEditStep6Action(publicId, items, reason)
        }
        {...EMBED}
      />
    );
  }

  if (stepId === 7) {
    const identity = await loadStep1Prefill(base);
    const data = await loadStep7Data({
      ...base,
      homeProvince: identity.province ?? null,
    });
    return (
      <CityPreferencesStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        allProvinces={IRAN_PROVINCES}
        initialItems={data.items}
        counselorSubmit={(items, reason) =>
          counselorEditStep7Action(publicId, items, reason)
        }
        {...EMBED}
      />
    );
  }

  if (stepId === 8) {
    const group = examGroup as GuidanceExamGroup;
    const data = await loadStep8Data({ ...base, examGroup: group });
    const majors = getMajorsForExamGroup(group);
    return (
      <MajorPreferencesStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialItems={data.items}
        majorLabels={Object.fromEntries(majors.map((m) => [m.code, m.label]))}
        examGroupLabel={examGroup}
        counselorSubmit={(items, reason) =>
          counselorEditStep8Action(publicId, items, reason)
        }
        {...EMBED}
      />
    );
  }

  if (stepId === 9) {
    const data = await loadStep9Data(base);
    return (
      <PriorityWeightsStep
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialOrderedCodes={data.orderedCodes}
        counselorSubmit={(codes, reason) =>
          counselorEditStep9Action(publicId, codes, reason)
        }
        {...EMBED}
      />
    );
  }

  return (
    <p className="counselor-workspace__muted">
      ویرایش این مرحله از فرم دانش‌آموز پشتیبانی نمی‌شود. برای پرداخت، رزرو و
      چیدمان از لینک‌های مرتبط همان مرحله استفاده کنید.
    </p>
  );
}
