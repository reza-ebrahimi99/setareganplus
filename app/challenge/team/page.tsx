import { ChallengeInvitationStatus } from "@/generated/prisma/enums";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { CopyShareButtons } from "@/components/challenge/CopyShareButtons";
import { InviteFriendForm } from "@/components/challenge/InviteFriendForm";
import { TeamNameForm } from "@/components/challenge/TeamNameForm";
import { maskIranianMobile } from "@/lib/challenge/data";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import { requireChallengePageContext } from "@/lib/challenge/page-context";

export const metadata = { title: "تیم من", robots: { index: false } };

export default async function ChallengeTeamPage() {
  const { participant, team } = await requireChallengePageContext();
  const members = team.participants.length;
  const completed = team.participants.filter((member) => member.completedAt).length;
  const open = Math.max(0, team.capacity - members);
  const teamUrl = `${getChallengePublicOrigin()}/join/${team.inviteCode}`;
  const pendingInvitations = team.invitations.filter(
    (invitation) =>
      invitation.status === ChallengeInvitationStatus.PENDING ||
      invitation.status === ChallengeInvitationStatus.SENT,
  ).filter(
    (invitation) => invitation.expiresAt > new Date(),
  );

  return (
    <ChallengeShell signedIn displayName={participant.fullName}>
      <div className="challenge-container">
        <header className="challenge-page-head">
          <div><span className="challenge-eyebrow">کد {team.inviteCode}</span><h1>{team.name}</h1><p>اعضای تیم و پیشرفت آزمون‌ها</p></div>
        </header>

        {participant.isCaptain ? (
          <section className="challenge-card" style={{ marginBottom: 14 }}>
            <h2 className="challenge-card-title">نام تیم شما</h2>
            <p className="challenge-card-sub">این نام در لینک دعوت، نتیجه و گواهی تیم نمایش داده می‌شود.</p>
            <div style={{ marginTop: 16 }}><TeamNameForm currentName={team.name} /></div>
          </section>
        ) : null}

        <div className="challenge-form-grid">
          <section className="challenge-card">
            <div className="challenge-progress-row"><span>تکمیل اعضا</span><strong>{members.toLocaleString("fa-IR")} از {team.capacity.toLocaleString("fa-IR")}</strong></div>
            <div className="challenge-progress"><span style={{ width: `${(members / team.capacity) * 100}%` }} /></div>
            <div className="challenge-members">
              {team.participants.map((member) => (
                <div className="challenge-member" key={member.id}>
                  <span className="challenge-avatar">{member.fullName.slice(0, 1)}</span>
                  <div className="challenge-member-info">
                    <strong>{member.fullName}{member.isCaptain ? " · سرگروه" : ""}</strong>
                    <small>{maskIranianMobile(member.normalizedMobile)} · {member.gradeLabel}</small>
                  </div>
                  <span className={member.completedAt ? "challenge-status challenge-status-done" : "challenge-status"}>
                    {member.completedAt ? "آزمون داده" : "در انتظار آزمون"}
                  </span>
                </div>
              ))}
            </div>
            <p className="challenge-card-sub">{completed.toLocaleString("fa-IR")} نفر از اعضای فعلی آزمون داده‌اند.</p>
          </section>

          {open > 0 ? (
            <section className="challenge-card">
              <h2 className="challenge-card-title">دعوت دوست جدید</h2>
              <p className="challenge-card-sub">با ثبت شماره، پیامک دعوت همان لحظه ارسال می‌شود. {open.toLocaleString("fa-IR")} جای خالی دارید.</p>
              <div style={{ marginTop: 18 }}><InviteFriendForm /></div>
            </section>
          ) : (
            <section className="challenge-card challenge-locked">
              <div className="challenge-lock-icon">✓</div>
              <h2 className="challenge-card-title">تیم پنج نفره کامل شد</h2>
              <p className="challenge-card-sub">حالا کافی است همه اعضا آزمون را کامل کنند.</p>
            </section>
          )}
        </div>

        {open > 0 ? (
          <section className="challenge-share-box">
            <div className="challenge-share-code"><span>لینک عمومی تیم</span><strong dir="ltr">{team.inviteCode}</strong></div>
            <p className="challenge-share-url">{teamUrl}</p>
            <CopyShareButtons url={teamUrl} text={`به تیم ${team.name} در چالش ۵ نفره ریاضی بپیوند:`} />
          </section>
        ) : null}

        {pendingInvitations.length > 0 ? (
          <section className="challenge-card" style={{ marginTop: 14 }}>
            <h2 className="challenge-card-title">دعوت‌های در انتظار</h2>
            <div className="challenge-members">
              {pendingInvitations.map((invitation) => (
                <div className="challenge-member" key={invitation.id}>
                  <span className="challenge-avatar">＋</span>
                  <div className="challenge-member-info"><strong>{invitation.inviteeName}</strong><small>{maskIranianMobile(invitation.normalizedMobile)}</small></div>
                  <span className="challenge-status">دعوت‌شده</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ChallengeShell>
  );
}
