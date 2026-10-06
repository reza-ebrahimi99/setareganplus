import Link from "next/link";
import { logoutChallengeAction } from "@/app/challenge/actions";

export function ChallengeShell(props: {
  children: React.ReactNode;
  signedIn?: boolean;
  displayName?: string;
  compact?: boolean;
}) {
  return (
    <div className="challenge-root" dir="rtl">
      <header className="challenge-header">
        <div className="challenge-container challenge-header-inner">
          <Link href="/" className="challenge-brand" aria-label="چالش ریاضی ستارگان">
            <span className="challenge-brand-mark">۵</span>
            <span>
              <strong>چالش ریاضی</strong>
              <small>ستارگان پلاس</small>
            </span>
          </Link>
          {props.signedIn ? (
            <div className="challenge-header-user">
              <span className="challenge-user-name">{props.displayName}</span>
              <form action={logoutChallengeAction}>
                <button className="challenge-text-button" type="submit">خروج</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="challenge-button challenge-button-quiet challenge-button-sm">
              ورود
            </Link>
          )}
        </div>
      </header>
      <main className={props.compact ? "challenge-main challenge-main-compact" : "challenge-main"}>
        {props.children}
      </main>
      {props.signedIn ? (
        <nav className="challenge-mobile-nav" aria-label="ناوبری اصلی">
          <Link href="/dashboard"><span aria-hidden>⌂</span>خانه</Link>
          <Link href="/team"><span aria-hidden>♟</span>تیم من</Link>
          <Link href="/exam"><span aria-hidden>✓</span>آزمون من</Link>
          <Link href="/result"><span aria-hidden>★</span>جایزه من</Link>
        </nav>
      ) : null}
    </div>
  );
}

