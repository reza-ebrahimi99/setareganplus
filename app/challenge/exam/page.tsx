import Link from "next/link";
import { startChallengeExamAction } from "@/app/challenge/actions";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { findChallengeExamForParticipant } from "@/lib/challenge/exam";
import { requireChallengePageContext } from "@/lib/challenge/page-context";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "آزمون من", robots: { index: false } };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ChallengeExamPage({ searchParams }: Props) {
  const { participant, campaign, team } = await requireChallengePageContext();
  const params = await searchParams;
  const exam = await findChallengeExamForParticipant({
    organizationId: participant.organizationId,
    campaignId: campaign.id,
    gradeKey: participant.gradeKey,
    majorKey: participant.majorKey,
  });
  const questionCount = exam
    ? await prisma.challengeQuestion.count({
        where: { examId: exam.id, isActive: true, deletedAt: null },
      })
    : 0;
  const submitted = Boolean(participant.attempts[0]);
  const memberCount = team.participants.length;
  const teamIsFull = memberCount >= team.capacity;
  const questionsPerMember = exam?.questionLimit ?? 10;
  const requiredBankSize = questionsPerMember * team.capacity;
  const bankIsReady = questionCount >= requiredBankSize;

  return (
    <ChallengeShell signedIn displayName={participant.fullName}>
      <div className="challenge-form-page">
        <header className="challenge-page-head"><div><span className="challenge-eyebrow">{participant.gradeLabel}</span><h1>آزمون من</h1><p>پاسخ‌ها فقط یک‌بار ثبت نهایی می‌شوند.</p></div></header>
        {params.error ? <p className="challenge-alert challenge-alert-error">{params.error}</p> : null}
        <section className="challenge-card">
          {submitted ? (
            <div className="challenge-locked">
              <div className="challenge-lock-icon">✓</div>
              <h2 className="challenge-card-title">آزمونت با موفقیت ثبت شده</h2>
              <p className="challenge-card-sub">نتیجه تا تکمیل آزمون همه اعضای تیم قفل می‌ماند.</p>
              <Link href="/result" className="challenge-button challenge-button-primary" style={{ marginTop: 16 }}>وضعیت نتیجه تیم</Link>
            </div>
          ) : !teamIsFull ? (
            <div className="challenge-locked">
              <div className="challenge-lock-icon">🔒</div>
              <h2 className="challenge-card-title">اول تیم پنج‌نفره را کامل کنید</h2>
              <p className="challenge-card-sub">
                {memberCount.toLocaleString("fa-IR")} از {team.capacity.toLocaleString("fa-IR")} نفر وارد تیم شده‌اند. آزمون بعد از ثبت‌نام همه اعضا باز می‌شود.
              </p>
              <div className="challenge-progress" style={{ marginTop: 18 }}>
                <span style={{ width: `${(memberCount / team.capacity) * 100}%` }} />
              </div>
              <Link href="/team" className="challenge-button challenge-button-primary" style={{ marginTop: 18 }}>دعوت و تکمیل اعضای تیم</Link>
            </div>
          ) : exam && !bankIsReady ? (
            <div className="challenge-locked">
              <div className="challenge-lock-icon">⌛</div>
              <h2 className="challenge-card-title">آزمون پایه شما در حال آماده‌سازی است</h2>
              <p className="challenge-card-sub">به محض تکمیل بانک سؤال، آزمون از همین صفحه باز می‌شود.</p>
            </div>
          ) : exam ? (
            <>
              <h2 className="challenge-card-title">{exam.title}</h2>
              <p className="challenge-card-sub">{exam.instructions || "پیش از شروع، اینترنت پایدار داشته باشید و تا پایان صفحه را نبندید."}</p>
              <div className="challenge-stat-grid">
                <div className="challenge-card challenge-stat"><small>زمان</small><strong>{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</strong></div>
                <div className="challenge-card challenge-stat"><small>سؤال</small><strong>{(exam.questionLimit || questionCount).toLocaleString("fa-IR")}</strong></div>
              </div>
              <form action={startChallengeExamAction} style={{ marginTop: 18 }}>
                <button className="challenge-button challenge-button-primary challenge-button-full" type="submit">شروع آزمون</button>
              </form>
            </>
          ) : (
            <div className="challenge-locked">
              <div className="challenge-lock-icon">⌛</div>
              <h2 className="challenge-card-title">آزمون پایه شما هنوز آماده نیست</h2>
              <p className="challenge-card-sub">به محض انتشار آزمون از همین صفحه در دسترس خواهد بود.</p>
            </div>
          )}
        </section>
      </div>
    </ChallengeShell>
  );
}
