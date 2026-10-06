import Link from "next/link";
import { ChallengeCampaignStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<ChallengeCampaignStatus, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  PAUSED: "متوقف",
  ENDED: "پایان‌یافته",
  ARCHIVED: "بایگانی",
};

export default async function AdminChallengesPage() {
  const session = await requirePermission("challenges.view");
  const campaigns = await prisma.challengeCampaign.findMany({
    where: { organizationId: session.organization.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, teams: true, exams: true } },
    },
  });
  const active = campaigns.find((campaign) => campaign.status === ChallengeCampaignStatus.ACTIVE);
  const [submitted, unlockedTeams, certificates] = active
    ? await Promise.all([
        prisma.challengeAttempt.count({ where: { campaignId: active.id, status: "SUBMITTED" } }),
        prisma.challengeTeam.count({ where: { campaignId: active.id, resultUnlockedAt: { not: null } } }),
        prisma.challengeCertificate.count({ where: { campaignId: active.id, revokedAt: null } }),
      ])
    : [0, 0, 0];

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold">چالش‌های گروهی</h1><p className="mt-1 text-sm text-muted">مدیریت کمپین، تیم‌ها، آزمون و جایزه</p></div>
        <Link href="/admin/challenges/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">کمپین جدید</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">شرکت‌کننده فعال</p><p className="mt-2 text-2xl font-bold">{active?._count.participants ?? 0}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">آزمون ثبت‌شده</p><p className="mt-2 text-2xl font-bold">{submitted}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">تیم نتیجه‌گرفته</p><p className="mt-2 text-2xl font-bold">{unlockedTeams}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">گواهی صادرشده</p><p className="mt-2 text-2xl font-bold">{certificates}</p></div>
      </div>

      <section>
        <h2 className="text-lg font-bold">کمپین‌ها</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/admin/challenges/${campaign.id}`} className="rounded-xl border bg-surface p-5 transition hover:border-slate-400">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="font-bold">{campaign.title}</h3><p className="mt-1 text-xs text-muted" dir="ltr">/{campaign.slug}</p></div>
                <span className={campaign.status === "ACTIVE" ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>{STATUS_LABEL[campaign.status]}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2"><strong className="block text-base">{campaign._count.participants}</strong>نفر</div>
                <div className="rounded-lg bg-slate-50 p-2"><strong className="block text-base">{campaign._count.teams}</strong>تیم</div>
                <div className="rounded-lg bg-slate-50 p-2"><strong className="block text-base">{campaign._count.exams}</strong>آزمون</div>
              </div>
            </Link>
          ))}
          {campaigns.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted">هنوز کمپینی ساخته نشده است.</div> : null}
        </div>
      </section>
    </div>
  );
}

