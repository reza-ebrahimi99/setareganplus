import Link from "next/link";
import { redirect } from "next/navigation";
import { ChallengeLoginForm } from "@/components/challenge/ChallengeLoginForm";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { resolveChallengeSession } from "@/lib/challenge/auth/session";
import { getConfiguredChallengeCampaign } from "@/lib/challenge/config";
import { getChallengeParticipant } from "@/lib/challenge/data";
import {
  findChallengeInvitation,
  findChallengeTeamByInviteCode,
} from "@/lib/challenge/invitations";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "ورود و ثبت‌نام", robots: { index: false } };

type Props = {
  searchParams: Promise<{ invite?: string; team?: string }>;
};

export default async function ChallengeLoginPage({ searchParams }: Props) {
  const [session, campaign] = await Promise.all([
    resolveChallengeSession(),
    getConfiguredChallengeCampaign(),
  ]);
  if (session) {
    const participant =
      campaign && campaign.organizationId === session.organizationId
        ? await getChallengeParticipant(session, campaign.id)
        : null;
    if (participant) redirect("/dashboard");
  }
  const params = await searchParams;
  const inviteToken = params.invite?.trim() ?? "";
  const teamCode = params.team?.trim().toUpperCase() ?? "";
  const invitation = inviteToken ? await findChallengeInvitation(inviteToken) : null;
  const team = !inviteToken && teamCode
    ? await findChallengeTeamByInviteCode(teamCode)
    : null;
  const requestedEntryInvalid = Boolean((inviteToken && !invitation) || (teamCode && !team));
  const prizeTiers = campaign
    ? await prisma.challengeScholarshipTier.findMany({
        where: { campaignId: campaign.id, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { minPercentage: "desc" }],
        take: 4,
      })
    : [];
  const restartHref = invitation
    ? `/login?invite=${encodeURIComponent(inviteToken)}`
    : team
      ? `/login?team=${encodeURIComponent(team.inviteCode)}`
      : "/login";

  return (
    <ChallengeShell compact>
      <div className="challenge-login-page">
        <section className="challenge-login-prize-hero" aria-labelledby="challenge-prize-title">
          <div className="challenge-login-prize-copy">
            <span>جایزه تیم پنج‌نفره شما</span>
            <h1 id="challenge-prize-title">با هم کامل کنید؛ با هم جایزه بگیرید.</h1>
            <p>بعد از ورود هر پنج عضو و پایان آزمون‌ها، نتیجه تیم، جایزه و گواهی رسمی هر نفر باز می‌شود.</p>
          </div>
          <div className="challenge-login-tier-grid">
            {prizeTiers.length > 0 ? prizeTiers.map((tier) => (
              <article key={tier.id}>
                <small>{tier.title}</small>
                <strong>{tier.prizeLabel}</strong>
                <span>
                  از {tier.minPercentage.toLocaleString("fa-IR")}٪
                  {tier.maxPercentage !== null ? ` تا ${tier.maxPercentage.toLocaleString("fa-IR")}٪` : " به بالا"}
                </span>
              </article>
            )) : (
              <article className="challenge-login-tier-placeholder">
                <small>برای هر پنج عضو</small>
                <strong>جایزه تیمی + گواهی رسمی</strong>
                <span>سطح جایزه بر اساس امتیاز نهایی تیم تعیین می‌شود.</span>
              </article>
            )}
          </div>
        </section>

        <div className="challenge-login-grid">
        <section className="challenge-card challenge-login-card">
          {requestedEntryInvalid ? (
            <>
              <h1>این دعوت دیگر معتبر نیست</h1>
              <p>ممکن است لینک منقضی شده یا ظرفیت تیم تکمیل شده باشد. می‌توانید تیم خودتان را بسازید.</p>
              <Link className="challenge-button challenge-button-primary challenge-button-full" href="/login">
                ساخت تیم جدید
              </Link>
            </>
          ) : (
            <>
              <span className="challenge-eyebrow">
                {invitation
                  ? `دعوت به ${invitation.team.name}`
                  : team
                    ? `پیوستن به ${team.name}`
                    : "ورود امن با کد یک‌بارمصرف"}
              </span>
              <h1>{invitation ? `${invitation.inviter.fullName} منتظر توست` : "آماده‌ای شروع کنیم؟"}</h1>
              <p>اطلاعاتت را وارد کن؛ کمتر از یک دقیقه تا ساخت یا پیوستن به تیم فاصله داری.</p>
              <ChallengeLoginForm
                inviteToken={invitation ? inviteToken : undefined}
                teamCode={team?.inviteCode}
                lockedMobile={invitation?.normalizedMobile}
                suggestedName={invitation?.inviteeName}
                restartHref={restartHref}
              />
            </>
          )}
        </section>
          <aside id="challenge-rules" className="challenge-card challenge-rules-card">
            <span className="challenge-eyebrow">قانون بازی روشن است</span>
            <h2>قبل از شروع این‌ها را بدان</h2>
            <ol>
              <li><span>۱</span><div><strong>تیم پنج‌نفره بسازید</strong><p>سرگروه چهار دوست را دعوت می‌کند و هر نفر با شماره خودش ثبت‌نام می‌کند.</p></div></li>
              <li><span>۲</span><div><strong>آزمون بعد از تکمیل تیم باز می‌شود</strong><p>تا هر پنج عضو وارد تیم نشده باشند، هیچ‌کس نمی‌تواند آزمون را شروع کند.</p></div></li>
              <li><span>۳</span><div><strong>هر نفر سؤال‌های مخصوص خودش را دارد</strong><p>از بانک سؤال، بسته جدا انتخاب می‌شود و ترتیب گزینه‌ها هم متفاوت است.</p></div></li>
              <li><span>۴</span><div><strong>پاسخ درست نمایش داده نمی‌شود</strong><p>نتیجه و جایزه تا پایان آزمون همه اعضا قفل می‌ماند.</p></div></li>
            </ol>
            {campaign?.terms ? (
              <details className="challenge-rules-details">
                <summary>متن کامل قوانین کمپین</summary>
                <p>{campaign.terms}</p>
              </details>
            ) : null}
          </aside>
        </div>
      </div>
    </ChallengeShell>
  );
}
