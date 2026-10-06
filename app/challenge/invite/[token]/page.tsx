import Link from "next/link";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { maskIranianMobile } from "@/lib/challenge/data";
import { findChallengeInvitation } from "@/lib/challenge/invitations";

type Props = { params: Promise<{ token: string }> };

export default async function ChallengeInvitePage({ params }: Props) {
  const { token } = await params;
  const invitation = await findChallengeInvitation(token);
  return (
    <ChallengeShell compact>
      <div className="challenge-form-page">
        <section className="challenge-card challenge-login-card">
          {invitation ? (
            <>
              <span className="challenge-eyebrow">دعوت اختصاصی تیم</span>
              <h1>{invitation.inviteeName}، جای تو در تیم خالی است!</h1>
              <p>
                {invitation.inviter.fullName} تو را به تیم «{invitation.team.name}» در {invitation.campaign.title} دعوت کرده است.
                دعوت برای شماره {maskIranianMobile(invitation.normalizedMobile)} ثبت شده.
              </p>
              <Link
                href={`/login?invite=${encodeURIComponent(token)}`}
                className="challenge-button challenge-button-primary challenge-button-full"
              >
                قبول دعوت و ورود
              </Link>
            </>
          ) : (
            <>
              <h1>دعوت منقضی شده است</h1>
              <p>از دوستت بخواه دوباره برایت پیامک دعوت بفرستد، یا همین حالا تیم خودت را بساز.</p>
              <Link href="/login" className="challenge-button challenge-button-primary challenge-button-full">ساخت تیم جدید</Link>
            </>
          )}
        </section>
      </div>
    </ChallengeShell>
  );
}

