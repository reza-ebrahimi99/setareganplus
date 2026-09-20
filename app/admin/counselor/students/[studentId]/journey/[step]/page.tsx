import { notFound } from "next/navigation";
import {
  CounselorV2JourneyStepView,
  parseCounselorJourneyStepParam,
} from "@/components/counselor-os/CounselorV2JourneyStepView";
import { requireCounselorContext, assertCounselorCanAccessStudent } from "@/lib/counselor-os/auth";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string; step: string }>;
};

export default async function CounselorJourneyStepPage({ params }: Props) {
  const { studentId, step: stepParam } = await params;
  const step = parseCounselorJourneyStepParam(stepParam);
  if (!step) notFound();

  const ctx = await requireCounselorContext();
  try {
    await assertCounselorCanAccessStudent({
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      studentId,
      canReview: ctx.canReview,
      isSupervisor: ctx.isSupervisor,
    });
  } catch {
    notFound();
  }

  return <CounselorV2JourneyStepView ctx={ctx} studentId={studentId} step={step} />;
}
