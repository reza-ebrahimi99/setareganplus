import { redirect } from "next/navigation";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { ExamRunner } from "@/components/challenge/ExamRunner";
import { getChallengeAttemptForDisplay } from "@/lib/challenge/exam";
import { requireChallengePageContext } from "@/lib/challenge/page-context";

type Props = {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ActiveChallengeExamPage({ params, searchParams }: Props) {
  const { attemptId } = await params;
  const query = await searchParams;
  const { participant } = await requireChallengePageContext();
  const attempt = await getChallengeAttemptForDisplay({
    attemptId,
    participantId: participant.id,
    organizationId: participant.organizationId,
  });
  if (!attempt) redirect("/exam");
  if (attempt.status === "SUBMITTED") redirect("/result");

  return (
    <ChallengeShell signedIn displayName={participant.fullName} compact>
      {query.error ? <div className="challenge-container"><p className="challenge-alert challenge-alert-error">{query.error}</p></div> : null}
      <ExamRunner
        attemptId={attempt.id}
        title={attempt.exam.title}
        expiresAt={attempt.expiresAt.toISOString()}
        questions={attempt.questions}
      />
    </ChallengeShell>
  );
}

