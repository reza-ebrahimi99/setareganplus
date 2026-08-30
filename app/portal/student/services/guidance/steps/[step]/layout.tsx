import { parseGuidanceJourneyStepParam } from "@/lib/guidance/journey/steps";
import { loadGuidanceJourneyEntry } from "@/lib/guidance/journey/guard";
import { loadStudentVisibleMessage } from "@/lib/guidance/workspace/review";

export default async function GuidanceStepLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const stepId = parseGuidanceJourneyStepParam(step);
  if (!stepId) return children;

  const { context, plan } = await loadGuidanceJourneyEntry();
  const message = await loadStudentVisibleMessage({
    organizationId: context.organization.id,
    planId: plan.id,
    stepNumber: stepId,
  });

  return (
    <>
      {message ? (
        <div
          className="gpj-banner gpj-banner--warning"
          role="status"
          style={{ margin: "0.75rem 1rem 0" }}
        >
          <strong>پیام مشاور</strong>
          <p>{message}</p>
        </div>
      ) : null}
      {children}
    </>
  );
}
