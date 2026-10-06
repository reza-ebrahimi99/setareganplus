import Link from "next/link";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { resolveChallengeSession } from "@/lib/challenge/auth/session";
import { getActiveChallengeCampaign } from "@/lib/challenge/config";

export default async function ChallengeLandingPage() {
  const [campaign, session] = await Promise.all([
    getActiveChallengeCampaign(),
    resolveChallengeSession(),
  ]);
  const ctaHref = session ? "/dashboard" : "/login";

  return (
    <ChallengeShell signedIn={Boolean(session)} displayName={session?.displayName}>
      <section className="challenge-hero">
        <div className="challenge-container challenge-hero-grid">
          <div>
            <span className="challenge-eyebrow">
              {campaign?.eyebrow ?? "چالش گروهی ستارگان"}
            </span>
            <h1>
              پنج نفر، یک تیم،
              <br />
              <span className="challenge-gradient-text">یک برد واقعی.</span>
            </h1>
            <p className="challenge-hero-lead">
              {campaign?.summary ??
                "چهار دوستت را دعوت کن، آزمون ریاضی مخصوص پایه‌تان را بدهید و بعد از تکمیل همه اعضا نتیجه، جایزه و گواهی رسمی تیم را دریافت کنید."}
            </p>
            <div className="challenge-hero-actions">
              {campaign ? (
                <Link href={ctaHref} className="challenge-button challenge-button-primary">
                  {session ? "ادامه چالش" : "شروع چالش رایگان"}
                </Link>
              ) : (
                <span className="challenge-button challenge-button-secondary">ثبت‌نام به‌زودی باز می‌شود</span>
              )}
              <a href="#how" className="challenge-button challenge-button-secondary">چطور کار می‌کند؟</a>
            </div>
            <div className="challenge-mini-proof">
              <span>ورود امن با پیامک</span>
              <span>آزمون متناسب با پایه</span>
              <span>گواهی قابل استعلام</span>
            </div>
          </div>
          <div className="challenge-team-visual" aria-label="تیم پنج نفره">
            <div className="challenge-team-orbit">
              <div className="challenge-orbit-center"><span><strong>۵</strong><small>نفر، یک تیم</small></span></div>
              {Array.from({ length: 5 }, (_, index) => (
                <span className="challenge-orbit-person" key={index}>{index + 1}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="challenge-section challenge-container">
        <h2>مسیر ساده تا نتیجه تیم</h2>
        <p className="challenge-section-intro">بدون فرم‌های طولانی؛ فقط سه قدم روشن.</p>
        <div className="challenge-feature-grid">
          <article className="challenge-feature-card">
            <span>۱</span><h3>تیمت را بساز</h3>
            <p>ثبت‌نام کن و لینک یا پیامک دعوت را برای چهار دوستت بفرست.</p>
          </article>
          <article className="challenge-feature-card">
            <span>۲</span><h3>همه آزمون بدهید</h3>
            <p>هر عضو آزمون متناسب با پایه و رشته خودش را مستقل انجام می‌دهد.</p>
          </article>
          <article className="challenge-feature-card">
            <span>۳</span><h3>نتیجه را باهم باز کنید</h3>
            <p>وقتی هر پنج نفر تمام کردند، نتیجه تیم، جایزه و گواهی‌ها باز می‌شود.</p>
          </article>
        </div>
      </section>

      <section className="challenge-section challenge-container">
        <div className="challenge-card challenge-prize">
          <small>جایزه بر پایه عملکرد واقعی تیم</small>
          <h2>باهم قوی‌تریم.</h2>
          <p>امتیاز همه اعضا در نتیجه تیم اثر دارد؛ پس همدیگر را تا خط پایان همراهی کنید.</p>
          {campaign ? <Link href={ctaHref} className="challenge-button challenge-button-secondary">تیمم را می‌سازم</Link> : null}
        </div>
      </section>
    </ChallengeShell>
  );
}

