import {
  LateStepLookBackNotice,
  LateStepPaymentLock,
  LateStepShell,
} from "@/components/guidance/v2-late/LateStepShell";
import { SessionBookingPanel } from "@/components/guidance/v2-late/SessionBookingPanel";
import { KonkurResultForm } from "@/components/guidance/v2-late/KonkurResultForm";
import { WaitingStatusCard } from "@/components/guidance/v2-late/WaitingStatusCard";
import { ChoiceReviewWorkspace } from "@/components/guidance/v2-late/ChoiceReviewWorkspace";
import { InformedConfirmPanel } from "@/components/guidance/v2-late/InformedConfirmPanel";
import { SanjeshSubmissionPanel } from "@/components/guidance/v2-late/SanjeshSubmissionPanel";
import { JourneyCompleteCard } from "@/components/guidance/v2-late/JourneyCompleteCard";
import {
  getGuidanceV2StepDefinition,
  guidanceJourneyV2StepPath,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { assertPackagePaid } from "@/lib/guidance/journey-v2/plan";
import { buildGuidanceV2Sidebar } from "@/lib/guidance/journey-v2/state";
import {
  APPOINTMENT_PURPOSE,
  CHOICE_LIST_KIND,
  CHOICE_LIST_STATUS,
  SANJESH_STATUS,
} from "@/lib/guidance/journey-v2/constants";
import {
  loadAssignedCounselorSlots,
  loadPurposeAppointmentView,
  sessionPurposeCopy,
} from "@/lib/guidance/journey-v2/appointments";
import { loadKonkurCaseView } from "@/lib/guidance/journey-v2/konkur";
import {
  distribution,
  loadChoiceListView,
  reviewStats,
} from "@/lib/guidance/journey-v2/choices";
import { labelArrangementState } from "@/lib/guidance/journey-v2/labels";
import { loadSanjeshCase } from "@/lib/guidance/journey-v2/sanjesh";
import { loadJourneyCompletionSummary } from "@/lib/guidance/journey-v2/completion";
import { toPersianDigits } from "@/lib/persian";

export async function renderGuidanceV2LateStep(step: GuidanceV2StepId) {
  const { plan, context } = await requireGuidanceV2StepAccess(step);
  const def = getGuidanceV2StepDefinition(step);
  const sidebarSteps = buildGuidanceV2Sidebar(plan);
  const orgId = context.organization.id;
  const studentId = plan.studentId;
  const packagePaid = assertPackagePaid(plan);
  const paymentHref = guidanceJourneyV2StepPath(10);
  const previousHref = guidanceJourneyV2StepPath(step - 1);
  const isCurrent = step === plan.currentStep;

  let body: React.ReactNode = null;

  if (!packagePaid) {
    body = <LateStepPaymentLock paymentHref={paymentHref} />;
  } else if (!isCurrent) {
    body = (
      <LateStepLookBackNotice
        currentStep={plan.currentStep}
        currentHref={guidanceJourneyV2StepPath(plan.currentStep)}
      />
    );
  } else if (step === 11 || step === 15) {
    const purpose =
      step === 15 ? APPOINTMENT_PURPOSE.SECOND_SESSION : APPOINTMENT_PURPOSE.FIRST_SESSION;
    const copy = sessionPurposeCopy(purpose);
    const [{ counselor, slots }, appointment] = await Promise.all([
      loadAssignedCounselorSlots({ organizationId: orgId, studentId, purpose }),
      loadPurposeAppointmentView({ organizationId: orgId, studentId, purpose }),
    ]);
    body = (
      <SessionBookingPanel
        step={step}
        purposeLabel={copy.description}
        counselor={counselor}
        slots={slots}
        appointment={appointment}
      />
    );
  } else if (step === 12) {
    const konkur = await loadKonkurCaseView({
      organizationId: orgId,
      studentId,
      planPublicId: plan.publicId,
      planId: plan.id,
      planExamGroup: plan.examGroup,
    });
    body = (
      <KonkurResultForm
        selected={konkur.selected}
        prefill={konkur.studentData}
        fields={konkur.fields}
        documentName={konkur.document?.filename ?? null}
      />
    );
  } else if (step === 13) {
    const list = await loadChoiceListView({
      organizationId: orgId,
      planId: plan.id,
      kind: CHOICE_LIST_KIND.INITIAL,
    });
    const stateKey =
      !list || list.items.length === 0
        ? "WAITING"
        : list.status === CHOICE_LIST_STATUS.READY
          ? "REVIEW_READY"
          : "IN_PROGRESS";
    body = (
      <WaitingStatusCard
        title={labelArrangementState(stateKey)}
        body="چیدمان فهرست انتخاب‌ها فقط توسط مشاور پرونده انجام می‌شود. پس از اعلام آمادگی مشاور، مرحله بررسی برای شما باز می‌شود."
        meta={
          list
            ? [{ label: "تعداد انتخاب فعال", value: String(list.items.filter((i) => i.isActive).length) }]
            : undefined
        }
      />
    );
  } else if (step === 14) {
    const list = await loadChoiceListView({
      organizationId: orgId,
      planId: plan.id,
      kind: CHOICE_LIST_KIND.INITIAL,
    });
    if (!list || list.status !== CHOICE_LIST_STATUS.READY) {
      body = (
        <WaitingStatusCard
          title={labelArrangementState("WAITING")}
          body="نسخه اولیه چیدمان هنوز از سمت مشاور اعلام نشده است."
        />
      );
    } else {
      const stats = await reviewStats(list);
      body = (
        <ChoiceReviewWorkspace
          list={list}
          stats={stats}
          distribution={distribution(list)}
        />
      );
    }
  } else if (step === 16) {
    const list = await loadChoiceListView({
      organizationId: orgId,
      planId: plan.id,
      kind: CHOICE_LIST_KIND.FINAL,
    });
    const ready = list?.status === CHOICE_LIST_STATUS.READY;
    body = (
      <WaitingStatusCard
        title={labelArrangementState(ready ? "FINAL_READY" : "FINAL_IN_PROGRESS")}
        body={
          ready
            ? "مشاور نسخه نهایی را آماده کرده است. در مرحله بعد می‌توانید آن را آگاهانه تأیید کنید."
            : "مشاور در حال اعمال اصلاحات نهایی بر اساس بازخورد شما و جلسه دوم است."
        }
      />
    );
  } else if (step === 17) {
    const list = await loadChoiceListView({
      organizationId: orgId,
      planId: plan.id,
      kind: CHOICE_LIST_KIND.FINAL,
    });
    if (!list || list.status !== CHOICE_LIST_STATUS.READY) {
      body = (
        <WaitingStatusCard
          title={labelArrangementState("FINAL_IN_PROGRESS")}
          body="نسخه نهایی هنوز برای تأیید شما اعلام نشده است."
        />
      );
    } else {
      body = <InformedConfirmPanel list={list} />;
    }
  } else if (step === 18) {
    const sanjesh = await loadSanjeshCase({ organizationId: orgId, planId: plan.id });
    const complete = plan.completedSteps.includes(18);
    if (complete && sanjesh.status === SANJESH_STATUS.VERIFIED) {
      const summary = await loadJourneyCompletionSummary({
        organizationId: orgId,
        studentId,
        plan,
      });
      body = <JourneyCompleteCard {...summary} />;
    } else {
      body = (
        <SanjeshSubmissionPanel
          view={sanjesh}
          locked={sanjesh.status === SANJESH_STATUS.VERIFIED}
        />
      );
    }
  }

  return (
    <LateStepShell
      stepId={step}
      title={def.title}
      description={def.description}
      sidebarSteps={sidebarSteps}
      completionPercentage={plan.completionPercentage}
      packagePaid={packagePaid}
      previousHref={previousHref}
      paymentHref={paymentHref}
      dashboardHref={GUIDANCE_CANONICAL_HOME}
    >
      {body}
      <p className="gv2-muted gv2-step-foot">
        مرحله جاری: {toPersianDigits(plan.currentStep)} — پیشرفت {toPersianDigits(plan.completionPercentage)}٪
      </p>
    </LateStepShell>
  );
}
