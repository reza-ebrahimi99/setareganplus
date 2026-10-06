import Link from "next/link";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { requireChallengePageContext } from "@/lib/challenge/page-context";

export const metadata = { title: "نتیجه و جایزه", robots: { index: false } };

export default async function ChallengeResultPage() {
  const { participant, team } = await requireChallengePageContext();
  const completed = team.participants.filter((member) => member.completedAt).length;
  const certificate = participant.certificates[0];
  const unlocked = Boolean(team.resultUnlockedAt);

  return (
    <ChallengeShell signedIn displayName={participant.fullName}>
      <div className="challenge-form-page">
        <header className="challenge-page-head"><div><span className="challenge-eyebrow">نتیجه گروهی</span><h1>جایزه من</h1><p>نتیجه فقط وقتی باز می‌شود که همه اعضا آزمون داده باشند.</p></div></header>
        {!unlocked ? (
          <section className="challenge-card challenge-locked">
            <div className="challenge-lock-icon">🔒</div>
            <h2 className="challenge-card-title">{completed.toLocaleString("fa-IR")} از {team.capacity.toLocaleString("fa-IR")} نفر آزمون داده‌اند</h2>
            <p className="challenge-card-sub">
              {team.participants.length < team.capacity
                ? `ابتدا ${team.capacity - team.participants.length} عضو دیگر به تیم اضافه کنید.`
                : "به محض ثبت آزمون آخرین هم‌تیمی، نتیجه برای همه باز و پیامک می‌شود."}
            </p>
            <div className="challenge-progress" style={{ marginTop: 20 }}><span style={{ width: `${(completed / team.capacity) * 100}%` }} /></div>
            <Link href="/team" className="challenge-button challenge-button-secondary" style={{ marginTop: 18 }}>مشاهده وضعیت اعضا</Link>
          </section>
        ) : (
          <>
            <section className="challenge-card challenge-prize">
              <small>تبریک به {team.name}</small>
              <h2>{team.scholarshipTier?.title ?? "چالش را کامل کردید"}</h2>
              <p>{team.scholarshipTier?.prizeLabel ?? "گواهی رسمی تکمیل چالش برای شما صادر شد."}</p>
            </section>
            <div className="challenge-stat-grid">
              <div className="challenge-card challenge-stat"><small>میانگین تیم</small><strong>{Math.round(team.averagePercentage ?? 0).toLocaleString("fa-IR")}٪</strong></div>
              <div className="challenge-card challenge-stat"><small>پاسخ درست</small><strong>{(team.totalCorrect ?? 0).toLocaleString("fa-IR")}</strong></div>
              <div className="challenge-card challenge-stat"><small>پاسخ غلط</small><strong>{(team.totalWrong ?? 0).toLocaleString("fa-IR")}</strong></div>
              <div className="challenge-card challenge-stat"><small>بی‌پاسخ</small><strong>{(team.totalUnanswered ?? 0).toLocaleString("fa-IR")}</strong></div>
            </div>
            {certificate ? (
              <section className="challenge-card" style={{ marginTop: 14 }}>
                <h2 className="challenge-card-title">گواهی رسمی تو آماده است</h2>
                <p className="challenge-card-sub">نسخه تصویر یا PDF را دانلود کن؛ اصالت گواهی با کد عمومی قابل استعلام است.</p>
                <Link href={`/certificate/${certificate.verificationCode}`} className="challenge-button challenge-button-primary challenge-button-full" style={{ marginTop: 16 }}>مشاهده و دانلود گواهی</Link>
              </section>
            ) : null}
          </>
        )}
      </div>
    </ChallengeShell>
  );
}

