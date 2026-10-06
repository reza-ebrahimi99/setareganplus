import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import {
  ChallengeCampaignStatus,
  ChallengeInvitationStatus,
  SmsMessageStatus,
} from "@/generated/prisma/enums";
import {
  createChallengeExamAction,
  createChallengeTierAction,
  updateChallengeTierAction,
  updateChallengeCampaignAction,
} from "@/app/admin/(dashboard)/challenges/actions";
import { ChallengeActionForm } from "@/components/admin/challenge/ChallengeActionForm";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { CHALLENGE_GRADES, CHALLENGE_MAJORS } from "@/lib/challenge/constants";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import { parseChallengeScoringConfig } from "@/lib/challenge/scoring";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ q?: string; grade?: string; major?: string; status?: string }>;
};

const STATUS_LABEL: Record<ChallengeCampaignStatus, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  PAUSED: "متوقف",
  ENDED: "پایان‌یافته",
  ARCHIVED: "بایگانی",
};

const INVITATION_STATUS_LABEL: Record<ChallengeInvitationStatus, string> = {
  PENDING: "در انتظار ارسال",
  SENT: "ارسال‌شده",
  ACCEPTED: "پذیرفته‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغوشده",
  FAILED: "ناموفق",
};

const SMS_STATUS_LABEL: Record<SmsMessageStatus, string> = {
  PENDING: "در صف ارسال",
  PROCESSING: "در حال ارسال",
  SENT: "ارسال موفق",
  FAILED: "ارسال ناموفق",
  DEAD_LETTER: "متوقف پس از خطا",
  CANCELLED: "لغوشده",
};

export default async function AdminChallengeDetailPage({ params, searchParams }: Props) {
  const session = await requirePermission("challenges.view");
  const canManage = hasPermission(session, "challenges.manage");
  const { campaignId } = await params;
  const filters = await searchParams;
  const q = filters.q?.trim() ?? "";

  const campaign = await prisma.challengeCampaign.findFirst({
    where: { id: campaignId, organizationId: session.organization.id, deletedAt: null },
    include: {
      exams: {
        where: { deletedAt: null },
        orderBy: [{ gradeKey: "asc" }, { majorKey: "asc" }],
        include: { _count: { select: { questions: true, attempts: true } } },
      },
      scholarshipTiers: { orderBy: [{ minPercentage: "desc" }, { sortOrder: "asc" }] },
      _count: { select: { participants: true, teams: true } },
    },
  });
  if (!campaign) notFound();

  const participantWhere: Prisma.ChallengeParticipantWhereInput = {
    organizationId: session.organization.id,
    campaignId,
    ...(filters.grade ? { gradeKey: filters.grade } : {}),
    ...(filters.major ? { majorKey: filters.major } : {}),
    ...(filters.status === "completed"
      ? { completedAt: { not: null } }
      : filters.status === "pending"
        ? { completedAt: null }
        : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { normalizedMobile: { contains: q } },
            { team: { name: { contains: q, mode: "insensitive" } } },
            { team: { inviteCode: { contains: q.toUpperCase() } } },
          ],
        }
      : {}),
  };
  const invitationWhere: Prisma.ChallengeInvitationWhereInput = {
    organizationId: session.organization.id,
    campaignId,
    ...(q
      ? {
          OR: [
            { inviteeName: { contains: q, mode: "insensitive" } },
            { normalizedMobile: { contains: q } },
            { inviter: { fullName: { contains: q, mode: "insensitive" } } },
            { inviter: { normalizedMobile: { contains: q } } },
            { team: { name: { contains: q, mode: "insensitive" } } },
            { team: { inviteCode: { contains: q.toUpperCase() } } },
          ],
        }
      : {}),
  };
  const [
    participants,
    participantCount,
    submittedCount,
    readyTeams,
    smsStats,
    invitations,
    invitationCount,
    uniqueInvitedMobiles,
  ] = await Promise.all([
    prisma.challengeParticipant.findMany({
      where: participantWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        team: { select: { id: true, name: true, inviteCode: true, resultUnlockedAt: true } },
        attempts: {
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: { percentage: true, submittedAt: true },
        },
      },
    }),
    prisma.challengeParticipant.count({ where: participantWhere }),
    prisma.challengeAttempt.count({ where: { campaignId, status: "SUBMITTED" } }),
    prisma.challengeTeam.count({ where: { campaignId, resultUnlockedAt: { not: null } } }),
    prisma.smsMessage.groupBy({
      by: ["status"],
      where: {
        organizationId: session.organization.id,
        purpose: "challenge_invitation",
        metadata: { path: ["campaignId"], equals: campaignId },
      },
      _count: { _all: true },
    }),
    prisma.challengeInvitation.findMany({
      where: invitationWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        inviter: { select: { fullName: true, normalizedMobile: true } },
        team: { select: { name: true, inviteCode: true } },
        acceptedParticipant: {
          select: {
            fullName: true,
            normalizedMobile: true,
            gradeLabel: true,
            majorLabel: true,
            completedAt: true,
          },
        },
      },
    }),
    prisma.challengeInvitation.count({ where: invitationWhere }),
    prisma.challengeInvitation.findMany({
      where: { organizationId: session.organization.id, campaignId },
      distinct: ["normalizedMobile"],
      select: { normalizedMobile: true },
    }),
  ]);
  const invitationSmsRows = invitations.length
    ? await prisma.smsMessage.findMany({
        where: {
          organizationId: session.organization.id,
          relatedType: "ChallengeInvitation",
          relatedId: { in: invitations.map((invitation) => invitation.id) },
        },
        orderBy: { createdAt: "desc" },
        select: {
          relatedId: true,
          status: true,
          provider: true,
          sentAt: true,
          lastError: true,
          createdAt: true,
        },
      })
    : [];
  const latestSmsByInvitation = new Map<string, (typeof invitationSmsRows)[number]>();
  for (const message of invitationSmsRows) {
    if (message.relatedId && !latestSmsByInvitation.has(message.relatedId)) {
      latestSmsByInvitation.set(message.relatedId, message);
    }
  }
  const scoring = parseChallengeScoringConfig(campaign.scoringConfig);
  const sentSms = smsStats.find((item) => item.status === SmsMessageStatus.SENT)?._count._all ?? 0;
  const challengeOrigin = getChallengePublicOrigin();
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (filters.grade) exportParams.set("grade", filters.grade);
  if (filters.major) exportParams.set("major", filters.major);
  if (filters.status) exportParams.set("status", filters.status);

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{campaign.title}</h1><span className={campaign.status === "ACTIVE" ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>{STATUS_LABEL[campaign.status]}</span></div>
          <p className="mt-1 text-sm text-muted">کد: <span dir="ltr">{campaign.slug}</span></p>
        </div>
        <div className="flex gap-2">
          <a href={`/admin/challenges/${campaign.id}/export.xlsx?${exportParams}`} className="rounded-lg border px-4 py-2 text-sm">خروجی Excel</a>
          <a href={challengeOrigin} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">مشاهده سایت</a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">شرکت‌کننده</p><p className="mt-2 text-xl font-bold">{campaign._count.participants}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">شماره یکتای دعوت‌شده</p><p className="mt-2 text-xl font-bold">{uniqueInvitedMobiles.length}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">تیم</p><p className="mt-2 text-xl font-bold">{campaign._count.teams}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">آزمون تکمیل</p><p className="mt-2 text-xl font-bold">{submittedCount}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">نتیجه بازشده</p><p className="mt-2 text-xl font-bold">{readyTeams}</p></div>
        <div className="rounded-xl border bg-surface p-4"><p className="text-xs text-muted">پیامک موفق</p><p className="mt-2 text-xl font-bold">{sentSms}</p></div>
      </div>

      <section className="rounded-xl border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">بانک شماره دوستان دعوت‌شده</h2>
            <p className="mt-1 text-xs text-muted">شماره دوست بلافاصله هنگام ثبت دعوت ذخیره می‌شود؛ حتی اگر هنوز ثبت‌نام نکرده باشد. حداکثر ۲۰۰ ردیف اینجا و همه ردیف‌ها در Excel هستند.</p>
          </div>
          <strong className="text-sm">{invitationCount} دعوت</strong>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted">
                <th className="p-3">نام دوست</th>
                <th className="p-3">شماره موبایل</th>
                <th className="p-3">دعوت‌کننده</th>
                <th className="p-3">تیم</th>
                <th className="p-3">وضعیت دعوت / پیامک</th>
                <th className="p-3">ثبت‌نام و آزمون</th>
                <th className="p-3">زمان ثبت</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const sms = latestSmsByInvitation.get(invitation.id);
                return (
                  <tr key={invitation.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{invitation.inviteeName}</td>
                    <td className="p-3" dir="ltr">{invitation.normalizedMobile}</td>
                    <td className="p-3">
                      {invitation.inviter.fullName}
                      <small className="block text-muted" dir="ltr">{invitation.inviter.normalizedMobile}</small>
                    </td>
                    <td className="p-3">
                      {invitation.team.name}
                      <small className="block text-muted" dir="ltr">{invitation.team.inviteCode}</small>
                    </td>
                    <td className="p-3">
                      <span>{INVITATION_STATUS_LABEL[invitation.status]}</span>
                      <small className={sms?.status === SmsMessageStatus.SENT ? "block text-emerald-700" : "block text-amber-700"}>
                        {sms ? SMS_STATUS_LABEL[sms.status] : "پیامک ثبت نشده"}
                      </small>
                      {sms?.lastError ? <small className="block max-w-48 truncate text-rose-700" title={sms.lastError}>خطا: {sms.lastError}</small> : null}
                    </td>
                    <td className="p-3">
                      {invitation.acceptedParticipant ? (
                        <>
                          <span className="text-emerald-700">ثبت‌نام کرده</span>
                          <small className="block text-muted">{invitation.acceptedParticipant.gradeLabel}{invitation.acceptedParticipant.majorLabel ? ` · ${invitation.acceptedParticipant.majorLabel}` : ""} · {invitation.acceptedParticipant.completedAt ? "آزمون داده" : "آزمون نداده"}</small>
                        </>
                      ) : "هنوز ثبت‌نام نکرده"}
                    </td>
                    <td className="p-3">{formatJalaliDateTimeShort(invitation.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invitations.length === 0 ? <p className="p-8 text-center text-sm text-muted">هنوز شماره‌ای ثبت نشده یا موردی مطابق جست‌وجو نیست.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">شرکت‌کنندگان و لیدها</h2><p className="mt-1 text-xs text-muted">حداکثر ۱۰۰ نتیجه نمایش داده می‌شود؛ خروجی Excel کامل است.</p></div><strong className="text-sm">{participantCount} نتیجه</strong></div>
        <form method="get" className="mt-4 grid gap-3 md:grid-cols-5">
          <input name="q" defaultValue={q} placeholder="نام، موبایل یا تیم" className="rounded-lg border px-3 py-2 text-sm" />
          <select name="grade" defaultValue={filters.grade ?? ""} className="rounded-lg border px-3 py-2 text-sm"><option value="">همه پایه‌ها</option>{CHALLENGE_GRADES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
          <select name="major" defaultValue={filters.major ?? ""} className="rounded-lg border px-3 py-2 text-sm"><option value="">همه رشته‌ها</option>{CHALLENGE_MAJORS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
          <select name="status" defaultValue={filters.status ?? ""} className="rounded-lg border px-3 py-2 text-sm"><option value="">همه وضعیت‌ها</option><option value="completed">آزمون داده</option><option value="pending">آزمون نداده</option></select>
          <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">اعمال فیلتر</button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b text-right text-xs text-muted"><th className="p-3">نام</th><th className="p-3">موبایل</th><th className="p-3">پایه / رشته</th><th className="p-3">تیم</th><th className="p-3">آزمون</th><th className="p-3">لید</th></tr></thead>
            <tbody>{participants.map((item) => (
              <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-medium">{item.fullName}</td><td className="p-3" dir="ltr">{item.normalizedMobile}</td><td className="p-3">{item.gradeLabel}{item.majorLabel ? ` · ${item.majorLabel}` : ""}</td><td className="p-3">{item.team?.name ?? "—"}<small className="block text-muted" dir="ltr">{item.team?.inviteCode}</small></td><td className="p-3">{item.attempts[0] ? `${Math.round(item.attempts[0].percentage ?? 0)}٪` : "در انتظار"}</td><td className="p-3">{item.leadId ? <Link className="text-blue-700 underline" href={`/admin/leads/${item.leadId}`}>باز کردن CRM</Link> : "—"}</td></tr>
            ))}</tbody>
          </table>
          {participants.length === 0 ? <p className="p-8 text-center text-sm text-muted">موردی مطابق فیلتر پیدا نشد.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="text-lg font-bold">آزمون‌های پایه‌ها</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {campaign.exams.map((exam) => (
            <Link href={`/admin/challenges/${campaign.id}/exams/${exam.id}`} key={exam.id} className="rounded-lg border p-4 hover:border-slate-400">
              <div className="flex justify-between gap-3"><strong>{exam.title}</strong><span className={exam.isPublished ? "text-xs text-emerald-700" : "text-xs text-amber-700"}>{exam.isPublished ? "منتشرشده" : "پیش‌نویس"}</span></div>
              <p className="mt-2 text-xs text-muted">{exam.gradeLabel}{exam.majorLabel ? ` · ${exam.majorLabel}` : ""} · {exam._count.questions} سؤال · {exam._count.attempts} تلاش</p>
            </Link>
          ))}
        </div>
        {canManage ? (
          <ChallengeActionForm
            action={createChallengeExamAction}
            className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-3"
            submitLabel="ساخت آزمون"
            pendingLabel="در حال ساخت آزمون…"
            submitClassName="rounded-lg bg-primary px-4 py-2 text-sm text-white"
          >
            <input type="hidden" name="campaignId" value={campaign.id} />
            <input name="title" placeholder="عنوان آزمون" className="rounded-lg border px-3 py-2 text-sm" />
            <select name="gradeKey" required className="rounded-lg border px-3 py-2 text-sm"><option value="">پایه</option>{CHALLENGE_GRADES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <select name="majorKey" className="rounded-lg border px-3 py-2 text-sm"><option value="">بدون تفکیک رشته</option>{CHALLENGE_MAJORS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <input name="durationMinutes" type="number" min="5" max="180" defaultValue="20" className="rounded-lg border px-3 py-2 text-sm" placeholder="زمان" />
            <input name="questionLimit" type="number" min="1" max="200" defaultValue="10" required placeholder="تعداد سؤال هر دانش‌آموز" className="rounded-lg border px-3 py-2 text-sm" />
            <input type="hidden" name="maxAttempts" value="1" />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="randomizeQuestions" defaultChecked />تصادفی‌سازی سؤال</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="randomizeOptions" defaultChecked />تصادفی‌سازی گزینه</label>
          </ChallengeActionForm>
        ) : null}
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="text-lg font-bold">سطوح بورسیه و جایزه</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {campaign.scholarshipTiers.map((tier) => canManage ? (
            <ChallengeActionForm
              action={updateChallengeTierAction}
              className={tier.isActive ? "space-y-3 rounded-lg border p-4" : "space-y-3 rounded-lg border border-dashed bg-slate-50 p-4 opacity-75"}
              key={tier.id}
              submitLabel="ذخیره این جایزه"
              pendingLabel="در حال ذخیره…"
              submitClassName="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
            >
              <input type="hidden" name="campaignId" value={campaign.id} />
              <input type="hidden" name="tierId" value={tier.id} />
              <label className="block text-xs">عنوان<input name="title" required defaultValue={tier.title} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="block text-xs">جایزه<input name="prizeLabel" required defaultValue={tier.prizeLabel} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="block text-xs">توضیح<textarea name="description" rows={2} defaultValue={tier.description ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">از درصد<input name="minPercentage" required type="number" min="0" max="100" step="0.01" defaultValue={tier.minPercentage} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" /></label>
                <label className="text-xs">تا درصد<input name="maxPercentage" type="number" min="0" max="100" step="0.01" defaultValue={tier.maxPercentage ?? ""} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" /></label>
              </div>
              <label className="block text-xs">ترتیب<input name="sortOrder" type="number" min="0" max="999" defaultValue={tier.sortOrder} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="flex items-center gap-2 text-xs"><input name="isActive" type="checkbox" defaultChecked={tier.isActive} />فعال و قابل تخصیص باشد</label>
            </ChallengeActionForm>
          ) : (
            <div className="rounded-lg border p-4" key={tier.id}><strong>{tier.title}</strong><p className="mt-1 text-xs text-muted">از {tier.minPercentage}٪ {tier.maxPercentage !== null ? `تا ${tier.maxPercentage}٪` : "به بالا"}</p><p className="mt-2 text-sm">{tier.prizeLabel}</p><small className="mt-2 block text-muted">{tier.isActive ? "فعال" : "غیرفعال"}</small></div>
          ))}
        </div>
        {canManage ? (
          <ChallengeActionForm
            action={createChallengeTierAction}
            className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-3"
            submitLabel="افزودن سطح"
            pendingLabel="در حال افزودن…"
            submitClassName="rounded-lg bg-primary px-4 py-2 text-sm text-white"
            resetOnSuccess
          >
            <input type="hidden" name="campaignId" value={campaign.id} />
            <input name="title" required placeholder="عنوان سطح" className="rounded-lg border px-3 py-2 text-sm" />
            <input name="prizeLabel" required placeholder="مثلاً بورسیه ۳۰٪" className="rounded-lg border px-3 py-2 text-sm" />
            <textarea name="description" rows={1} placeholder="توضیح جایزه (اختیاری)" className="rounded-lg border px-3 py-2 text-sm" />
            <input name="minPercentage" required type="number" min="0" max="100" step="0.01" placeholder="حداقل درصد" className="rounded-lg border px-3 py-2 text-sm" />
            <input name="maxPercentage" type="number" min="0" max="100" step="0.01" placeholder="حداکثر درصد (اختیاری)" className="rounded-lg border px-3 py-2 text-sm" />
            <input name="sortOrder" type="number" defaultValue="0" className="rounded-lg border px-3 py-2 text-sm" />
          </ChallengeActionForm>
        ) : null}
      </section>

      {canManage ? (
        <section className="rounded-xl border bg-surface p-5">
          <h2 className="text-lg font-bold">تنظیمات کمپین، امتیاز و پیامک</h2>
          <ChallengeActionForm
            action={updateChallengeCampaignAction}
            className="mt-5 space-y-5"
            submitLabel="ذخیره تنظیمات"
            pendingLabel="در حال ذخیره تنظیمات…"
          >
            <input type="hidden" name="campaignId" value={campaign.id} />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs">عنوان<input name="title" required defaultValue={campaign.title} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="text-xs">وضعیت<select name="status" defaultValue={campaign.status} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{Object.values(ChallengeCampaignStatus).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
              <label className="text-xs">اندازه تیم<input name="teamSize" type="number" min="2" max="20" defaultValue={campaign.teamSize} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="text-xs">برچسب<input name="eyebrow" defaultValue={campaign.eyebrow} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold">زمان‌بندی کمپین</h3>
                <p className="text-xs text-muted">همه تاریخ‌ها شمسی و ساعت‌ها بر اساس تهران هستند.</p>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-slate-50 p-3">
                  <label htmlFor="challenge-starts-at" className="text-xs font-medium">شروع کمپین (شمسی)</label>
                  <JalaliDateTimeFields id="challenge-starts-at" name="startsAt" defaultDate={campaign.startsAt} timeOptional />
                </div>
                <div className="rounded-xl border bg-slate-50 p-3">
                  <label htmlFor="challenge-ends-at" className="text-xs font-medium">پایان کمپین (شمسی)</label>
                  <JalaliDateTimeFields id="challenge-ends-at" name="endsAt" defaultDate={campaign.endsAt} timeOptional />
                </div>
                <div className="rounded-xl border bg-slate-50 p-3">
                  <label htmlFor="challenge-exam-opens-at" className="text-xs font-medium">باز شدن آزمون (شمسی)</label>
                  <JalaliDateTimeFields id="challenge-exam-opens-at" name="examOpensAt" defaultDate={campaign.examOpensAt} timeOptional />
                </div>
                <div className="rounded-xl border bg-slate-50 p-3">
                  <label htmlFor="challenge-exam-closes-at" className="text-xs font-medium">بسته شدن آزمون (شمسی)</label>
                  <JalaliDateTimeFields id="challenge-exam-closes-at" name="examClosesAt" defaultDate={campaign.examClosesAt} timeOptional />
                </div>
              </div>
            </div>
            <label className="block text-xs">خلاصه<textarea name="summary" required rows={2} defaultValue={campaign.summary} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <label className="block text-xs">توضیحات<textarea name="description" required rows={3} defaultValue={campaign.description} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <label className="block text-xs">قوانین<textarea name="terms" rows={3} defaultValue={campaign.terms ?? ""} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <div><h3 className="text-sm font-bold">فرمول امتیاز</h3><div className="mt-2 grid gap-3 md:grid-cols-3"><label className="text-xs">پاسخ درست<input name="scoreCorrect" type="number" step="0.01" defaultValue={scoring.correct} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs">پاسخ غلط<input name="scoreWrong" type="number" max="0" step="0.01" defaultValue={scoring.wrong} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs">بی‌پاسخ<input name="scoreUnanswered" type="number" max="0" step="0.01" defaultValue={scoring.unanswered} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label></div></div>
            <div className="grid gap-3 md:grid-cols-2"><label className="text-xs">متن پیامک دعوت<textarea name="inviteSmsTemplate" required rows={3} defaultValue={campaign.inviteSmsTemplate} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /><small className="text-muted">متغیرها: {"{{inviterName}} {{campaignTitle}} {{inviteUrl}} {{teamName}}"}</small></label><label className="text-xs">پیامک آماده شدن نتیجه<textarea name="completionSmsTemplate" required rows={3} defaultValue={campaign.completionSmsTemplate} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /><small className="text-muted">متغیرها: {"{{name}} {{campaignTitle}} {{resultUrl}}"}</small></label></div>
            <div className="grid gap-3 md:grid-cols-2"><label className="text-xs">عنوان گواهی<input name="certificateTitle" required defaultValue={campaign.certificateTitle} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs">زیرعنوان گواهی<input name="certificateSubtitle" required defaultValue={campaign.certificateSubtitle} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs">نام امضاکننده<input name="certificateSignatory" required defaultValue={campaign.certificateSignatory} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs">سمت امضاکننده<input name="certificateRole" required defaultValue={campaign.certificateRole} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label></div>
          </ChallengeActionForm>
        </section>
      ) : null}
    </div>
  );
}
