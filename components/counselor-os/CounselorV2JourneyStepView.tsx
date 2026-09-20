import Link from "next/link";
import { notFound } from "next/navigation";
import {
  counselorV2JourneyStep1Action,
  counselorV2JourneyStep2Action,
  counselorV2JourneyStep4Action,
  counselorV2JourneyStep6Action,
  counselorV2JourneyStep7Action,
  counselorV2JourneyStep8Action,
  counselorV2JourneyStep9Action,
} from "@/app/admin/counselor/counselor-v2-journey-actions";
import { PersonalInfoV2Step } from "@/components/guidance/journey-v2/PersonalInfoV2Step";
import { ExamGroupsV2Step } from "@/components/guidance/journey-v2/ExamGroupsV2Step";
import { HollandV2Step } from "@/components/guidance/journey-v2/HollandV2Step";
import { EducationPreferencesV2Step } from "@/components/guidance/journey-v2/EducationPreferencesV2Step";
import { CityPreferencesV2Step } from "@/components/guidance/journey-v2/CityPreferencesV2Step";
import { MajorPreferencesV2Step } from "@/components/guidance/journey-v2/MajorPreferencesV2Step";
import { PriorityFactorsV2Step } from "@/components/guidance/journey-v2/PriorityFactorsV2Step";
import { CounselorJourneyStep3GradesPanel } from "@/components/counselor-os/CounselorJourneyStep3GradesPanel";
import { CounselorJourneyStep5ResultPanel } from "@/components/counselor-os/CounselorJourneyStep5ResultPanel";
import { CounselorSteps1118Workspace } from "@/components/counselor-os/CounselorSteps1118Workspace";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { loadSteps1118WorkspaceModel } from "@/lib/counselor-os/steps-11-18-workspace";
import {
  isGuidanceV2StepId,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { loadGuidanceV2Step1 } from "@/lib/guidance/journey-v2/steps/step1-personal-info";
import { loadGuidanceV2Step2 } from "@/lib/guidance/journey-v2/steps/step2-exam-groups";
import { loadActiveHollandResult } from "@/lib/guidance/journey-v2/holland-attempts";
import { loadGuidanceV2Step6 } from "@/lib/guidance/journey-v2/steps/step6-education-preferences";
import { loadGuidanceV2Step7 } from "@/lib/guidance/journey-v2/steps/step7-city-preferences";
import { loadGuidanceV2Step8 } from "@/lib/guidance/journey-v2/steps/step8-major-preferences";
import {
  GUIDANCE_V2_PRIORITY_FACTORS,
  loadGuidanceV2Step9,
} from "@/lib/guidance/journey-v2/steps/step9-priority-factors";
import { loadGuidanceStepData } from "@/lib/guidance/journey/step-store";
import type { AssessmentAnswers } from "@/lib/guidance/journey/assessment/scoring";
import { getMajorsForExamGroup } from "@/lib/guidance/journey/reference-data/majors";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import { prisma } from "@/lib/prisma";
import { GuidanceDocumentType } from "@/generated/prisma/enums";
import { workspaceVerificationLabel } from "@/lib/guidance/workspace/presentation";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import { CounselorRevisionHistoryPanel } from "@/components/counselor-os/CounselorRevisionHistoryPanel";
import { loadStepRevisionHistory } from "@/lib/guidance/journey-v2/step-review/revision-history";

const EMPTY_SIDEBAR = [] as const;

function embed(studentId: string, formAction: typeof counselorV2JourneyStep1Action) {
  return { studentId, formAction };
}

export async function CounselorV2JourneyStepView(props: {
  ctx: CounselorContext;
  studentId: string;
  step: GuidanceV2StepId;
}) {
  const plan = await loadGuidanceV2Plan({
    organizationId: props.ctx.organizationId,
    studentId: props.studentId,
  });
  if (!plan) notFound();

  const student = await prisma.student.findFirst({
    where: { id: props.studentId, organizationId: props.ctx.organizationId },
    select: {
      fullName: true,
      portalAccountLinks: { select: { user: { select: { mobile: true } } }, take: 1 },
    },
  });
  if (!student) notFound();

  const mobile = student.portalAccountLinks[0]?.user.mobile ?? "";
  const history = await loadStepRevisionHistory({
    organizationId: props.ctx.organizationId,
    planId: plan.id,
    stepNumber: props.step,
  });

  const caseHref = `/admin/counselor/students/${props.studentId}?tab=journey`;

  let body: React.ReactNode = null;

  if (props.step === 1) {
    const stored = await loadGuidanceV2Step1({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
    });
    body = (
      <PersonalInfoV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        mobile={mobile}
        provinces={IRAN_PROVINCES}
        prefill={{
          firstName: stored.data?.firstName ?? "",
          lastName: stored.data?.lastName ?? "",
          nationalId: stored.data?.nationalId ?? "",
          gender: stored.data?.gender ?? "",
          birthDateJalali: stored.data?.birthDateJalali ?? "",
          nativeProvince: stored.data?.nativeProvince ?? "",
          regionQuota: stored.data?.regionQuota ?? "",
          specialQuota: stored.data?.specialQuota ?? "",
          highSchoolAverage: stored.data?.highSchoolAverage?.toString() ?? "",
          alternateMobile: stored.data?.alternateMobile ?? "",
        }}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep1Action)}
      />
    );
  } else if (props.step === 2) {
    const stored = await loadGuidanceV2Step2({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
      fallbackPrimary: plan.examGroup,
    });
    body = (
      <ExamGroupsV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialPrimary={stored.data?.primary ?? plan.examGroup}
        initialSecondary={stored.data?.secondary ?? []}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep2Action)}
      />
    );
  } else if (props.step === 3) {
    const doc = await prisma.guidanceDocument.findFirst({
      where: {
        organizationId: props.ctx.organizationId,
        planId: plan.id,
        documentType: GuidanceDocumentType.FINAL_GRADES,
        isLatest: true,
        deletedAt: null,
      },
      select: {
        id: true,
        originalFilename: true,
        versionNumber: true,
        verificationStatus: true,
        createdAt: true,
      },
    });
    body = (
      <CounselorJourneyStep3GradesPanel
        studentId={props.studentId}
        document={
          doc
            ? {
                id: doc.id,
                filename: doc.originalFilename,
                versionNumber: doc.versionNumber,
                verificationLabel: workspaceVerificationLabel(doc.verificationStatus),
                createdAtIso: doc.createdAt.toISOString(),
                downloadHref: `/admin/counselor/students/${props.studentId}/documents/${doc.id}/download`,
              }
            : null
        }
      />
    );
  } else if (props.step === 4) {
    const stored = await loadGuidanceStepData<AssessmentAnswers>({
      organizationId: props.ctx.organizationId,
      category: "guidance-v2-interest-assessment",
      kind: "guidance-v2-interest-assessment",
      planPublicId: plan.publicId,
      validate: (raw) => (raw && typeof raw === "object" ? (raw as AssessmentAnswers) : null),
    });
    body = (
      <HollandV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialAnswers={stored.data ?? {}}
        hollandRetakePending={plan.v2HollandRetakePending}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep4Action)}
      />
    );
  } else if (props.step === 5) {
    const result = await loadActiveHollandResult({
      organizationId: props.ctx.organizationId,
      planId: plan.id,
    });
    if (!result) {
      body = (
        <section className="cos-panel">
          <p className="cos-muted">هنوز نتیجه رغبت‌سنجی تکمیل نشده است.</p>
          <Link
            href={`/admin/counselor/students/${props.studentId}/journey/4`}
            className="cos-btn"
          >
            رفتن به مرحله رغبت‌سنجی
          </Link>
        </section>
      );
    } else {
      body = (
        <CounselorJourneyStep5ResultPanel studentId={props.studentId} result={result} />
      );
    }
  } else if (props.step === 6) {
    const stored = await loadGuidanceV2Step6({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
    });
    body = (
      <EducationPreferencesV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        initialItems={stored.items}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep6Action)}
      />
    );
  } else if (props.step === 7) {
    const step1 = await loadGuidanceV2Step1({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
    });
    const stored = await loadGuidanceV2Step7({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
      homeProvince: step1.data?.nativeProvince ?? null,
    });
    body = (
      <CityPreferencesV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        allProvinces={IRAN_PROVINCES}
        initialItems={stored.items}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep7Action)}
      />
    );
  } else if (props.step === 8) {
    const step2 = await loadGuidanceV2Step2({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
      fallbackPrimary: plan.examGroup,
    });
    const examGroups = [
      step2.data?.primary ?? plan.examGroup,
      ...(step2.data?.secondary ?? []),
    ];
    const labels: Record<string, string> = {
      MATHEMATICS: "ریاضی و فیزیک",
      EXPERIMENTAL_SCIENCES: "علوم تجربی",
      HUMANITIES: "علوم انسانی",
      ARTS: "هنر",
      LANGUAGES: "زبان‌های خارجی",
    };
    const majorsByGroup = examGroups.map((group) => ({
      group,
      label: labels[group] ?? String(group),
      majors: getMajorsForExamGroup(group as GuidanceExamGroup),
    }));
    const stored = await loadGuidanceV2Step8({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
      examGroups,
    });
    body = (
      <MajorPreferencesV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        majorsByGroup={majorsByGroup}
        initialItems={stored.items}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep8Action)}
      />
    );
  } else if (props.step === 9) {
    const stored = await loadGuidanceV2Step9({
      organizationId: props.ctx.organizationId,
      planPublicId: plan.publicId,
    });
    body = (
      <PriorityFactorsV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        factors={GUIDANCE_V2_PRIORITY_FACTORS}
        initialOrderedCodes={stored.orderedCodes}
        counselorEmbed={embed(props.studentId, counselorV2JourneyStep9Action)}
      />
    );
  } else if (props.step === 10) {
    body = (
      <section className="cos-panel cos-panel--warn">
        <h3>پلن و پرداخت — فقط مشاهده</h3>
        <p>
          وضعیت پرداخت و entitlement از این ویرایشگر قابل تغییر نیست. بسته:{" "}
          {plan.guidancePackageCode ?? "—"}
          {plan.packagePaidAtIso ? " · پرداخت‌شده" : " · پرداخت نشده"}
        </p>
      </section>
    );
  } else if (props.step >= 11 && props.step <= 18) {
    const ws = await loadSteps1118WorkspaceModel(props.ctx, props.studentId);
    body = (
      <CounselorSteps1118Workspace
        model={ws}
        isSupervisor={props.ctx.isSupervisor}
        focusStep={props.step}
      />
    );
  }

  return (
    <div className="cos-page cos-journey-step-edit" dir="rtl">
      <header className="cos-journey18-control__head">
        <div>
          <p className="cos-page__eyebrow">
            <Link href={caseHref}>بازگشت به کنترل ۱۸ مرحله</Link>
          </p>
          <h1>
            {toPersianDigits(props.step)} — {counselorV2StepTitle(props.step)} — {student.fullName}
          </h1>
        </div>
      </header>
      {body}
      <CounselorRevisionHistoryPanel entries={history} />
    </div>
  );
}

export function parseCounselorJourneyStepParam(raw: string): GuidanceV2StepId | null {
  const n = Number(raw);
  return isGuidanceV2StepId(n) ? n : null;
}
