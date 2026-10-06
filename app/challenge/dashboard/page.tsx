import Link from "next/link";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import { requireChallengePageContext } from "@/lib/challenge/page-context";

export const metadata = { title: "پرتال من", robots: { index: false } };

export default async function ChallengeDashboardPage() {
  const { session, campaign, participant, team } = await requireChallengePageContext();
  const members = team.participants.length;
  const completed = team.participants.filter((member) => member.completedAt).length;
  const certificate = participant.certificates[0];
  const shareUrl = `${getChallengePublicOrigin()}/join/${team.inviteCode}`;

  return (
    <ChallengeShell signedIn displayName={participant.fullName || session.displayName}>
      <div className="challenge-container">
        <header className="challenge-page-head">
          <div>
            <span className="challenge-eyebrow">{campaign.title}</span>
            <h1>سلام {participant.fullName.split(" ")[0]} 👋</h1>
            <p>وضعیت تیمت را ببین و قدم بعدی را بردار.</p>
          </div>
        </header>

        <section className="challenge-card">
          <div className="challenge-progress-row">
            <span>{team.name}</span>
            <strong>{members.toLocaleString("fa-IR")} از {team.capacity.toLocaleString("fa-IR")} عضو</strong>
          </div>
          <div className="challenge-progress" aria-label={`${members} از ${team.capacity} عضو`}>
            <span style={{ width: `${Math.min(100, (members / team.capacity) * 100)}%` }} />
          </div>
          <p className="challenge-card-sub">
            {members < team.capacity
              ? `${team.capacity - members} نفر دیگر تا تکمیل تیم باقی مانده.`
              : `${completed} از ${team.capacity} عضو آزمون را کامل کرده‌اند.`}
          </p>
        </section>

        <div className="challenge-dashboard-grid">
          <Link href="/team" className="challenge-card challenge-card-link">
            <div><h2 className="challenge-card-title">تیم من</h2><p className="challenge-card-sub">اعضا، دعوت‌ها و لینک اختصاصی</p></div>
          </Link>
          <Link href="/exam" className="challenge-card challenge-card-link">
            <div><h2 className="challenge-card-title">آزمون من</h2><p className="challenge-card-sub">آزمون مخصوص {participant.gradeLabel}</p></div>
          </Link>
          <Link href="/result" className="challenge-card challenge-card-link">
            <div><h2 className="challenge-card-title">جایزه من</h2><p className="challenge-card-sub">{team.resultUnlockedAt ? "نتیجه تیم آماده است" : "پس از تکمیل هر پنج آزمون"}</p></div>
          </Link>
        </div>

        {certificate ? (
          <section className="challenge-card" style={{ marginTop: 14 }}>
            <h2 className="challenge-card-title">گواهی تو آماده است</h2>
            <p className="challenge-card-sub">قابل دانلود به‌صورت تصویر و PDF، با کد استعلام عمومی.</p>
            <Link href={`/certificate/${certificate.verificationCode}`} className="challenge-button challenge-button-primary" style={{ marginTop: 14 }}>
              مشاهده گواهی
            </Link>
          </section>
        ) : members < team.capacity ? (
          <section className="challenge-share-box">
            <div className="challenge-share-code"><span>کد تیم</span><strong dir="ltr">{team.inviteCode}</strong></div>
            <p className="challenge-share-url">{shareUrl}</p>
          </section>
        ) : null}
      </div>
    </ChallengeShell>
  );
}

