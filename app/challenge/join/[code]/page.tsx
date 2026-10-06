import Link from "next/link";
import { ChallengeShell } from "@/components/challenge/ChallengeShell";
import { findChallengeTeamByInviteCode } from "@/lib/challenge/invitations";

type Props = { params: Promise<{ code: string }> };

export default async function ChallengeTeamJoinPage({ params }: Props) {
  const { code } = await params;
  const team = await findChallengeTeamByInviteCode(code);
  const remaining = team ? Math.max(0, team.capacity - team._count.participants) : 0;
  return (
    <ChallengeShell compact>
      <div className="challenge-form-page">
        <section className="challenge-card challenge-login-card">
          {team && remaining > 0 ? (
            <>
              <span className="challenge-eyebrow">{remaining} جای خالی</span>
              <h1>به {team.name} بپیوند</h1>
              <p>این تیم برای {team.campaign.title} ساخته شده و منتظر کامل شدن اعضاست.</p>
              <Link
                href={`/login?team=${encodeURIComponent(team.inviteCode)}`}
                className="challenge-button challenge-button-primary challenge-button-full"
              >
                عضویت در این تیم
              </Link>
            </>
          ) : (
            <>
              <h1>ظرفیت این تیم تکمیل است</h1>
              <p>می‌توانی یک تیم جدید بسازی و دوستان خودت را دعوت کنی.</p>
              <Link href="/login" className="challenge-button challenge-button-primary challenge-button-full">ساخت تیم جدید</Link>
            </>
          )}
        </section>
      </div>
    </ChallengeShell>
  );
}

