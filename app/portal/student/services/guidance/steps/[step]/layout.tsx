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
        <article className="chamber-letter" role="status">
          <time>از میز مشاور</time>
          <h2>پیام مهندس</h2>
          <p>{message}</p>
          <footer>رضا ابراهیمی</footer>
        </article>
      ) : null}
      {children}
    </>
  );
}
