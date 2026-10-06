import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  AuditAction,
  ChallengeInvitationStatus,
  SmsMessageStatus,
} from "@/generated/prisma/enums";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

function faDate(value: Date | null): string {
  return value ? formatJalaliDateTimeShort(value) : "";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  let session;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }
  if (!hasPermission(session, "challenges.view")) {
    return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
  }
  const { campaignId } = await context.params;
  const campaign = await prisma.challengeCampaign.findFirst({
    where: { id: campaignId, organizationId: session.organization.id, deletedAt: null },
    select: { id: true, title: true, slug: true },
  });
  if (!campaign) return NextResponse.json({ error: "کمپین پیدا نشد." }, { status: 404 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const grade = url.searchParams.get("grade")?.trim() ?? "";
  const major = url.searchParams.get("major")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const where: Prisma.ChallengeParticipantWhereInput = {
    organizationId: session.organization.id,
    campaignId,
    ...(grade ? { gradeKey: grade } : {}),
    ...(major ? { majorKey: major } : {}),
    ...(status === "completed"
      ? { completedAt: { not: null } }
      : status === "pending"
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

  const [participants, teams, invitations, allParticipants] = await Promise.all([
    prisma.challengeParticipant.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        team: { select: { name: true, inviteCode: true, resultUnlockedAt: true } },
        lead: {
          select: {
            id: true,
            status: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
        attempts: {
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: {
            percentage: true,
            rawScore: true,
            maxScore: true,
            correctCount: true,
            wrongCount: true,
            unansweredCount: true,
            submittedAt: true,
          },
        },
        certificates: {
          where: { revokedAt: null },
          orderBy: { issuedAt: "desc" },
          take: 1,
          select: {
            verificationCode: true,
            serialNumber: true,
            issuedAt: true,
          },
        },
      },
    }),
    prisma.challengeTeam.findMany({
      where: { organizationId: session.organization.id, campaignId },
      orderBy: { createdAt: "asc" },
      include: {
        scholarshipTier: { select: { title: true, prizeLabel: true } },
        participants: { select: { completedAt: true } },
        _count: { select: { participants: true, invitations: true, certificates: true } },
      },
    }),
    prisma.challengeInvitation.findMany({
      where: { organizationId: session.organization.id, campaignId },
      orderBy: { createdAt: "desc" },
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
    prisma.challengeParticipant.findMany({
      where: { organizationId: session.organization.id, campaignId },
      orderBy: { createdAt: "desc" },
      select: {
        fullName: true,
        normalizedMobile: true,
        gradeLabel: true,
        majorLabel: true,
        source: true,
        completedAt: true,
        createdAt: true,
        team: { select: { name: true, inviteCode: true } },
      },
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

  type PhoneBankValue = {
    participant?: (typeof allParticipants)[number];
    invitations: Array<(typeof invitations)[number]>;
  };
  const phoneBank = new Map<string, PhoneBankValue>();
  for (const participant of allParticipants) {
    phoneBank.set(participant.normalizedMobile, { participant, invitations: [] });
  }
  for (const invitation of invitations) {
    const existing = phoneBank.get(invitation.normalizedMobile) ?? { invitations: [] };
    existing.invitations.push(invitation);
    phoneBank.set(invitation.normalizedMobile, existing);
  }
  const phoneBankRows = [...phoneBank.entries()]
    .map(([mobile, entry]) => {
      const latestInvitation = entry.invitations[0];
      const latestSms = latestInvitation
        ? latestSmsByInvitation.get(latestInvitation.id)
        : undefined;
      const lastActivity = latestInvitation?.createdAt ?? entry.participant?.createdAt ?? new Date(0);
      return { mobile, entry, latestInvitation, latestSms, lastActivity };
    })
    .sort((left, right) => right.lastActivity.getTime() - left.lastActivity.getTime());

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SetareganPlus";
  workbook.created = new Date();
  workbook.subject = `گزارش کامل ${campaign.title}`;
  const challengeOrigin = getChallengePublicOrigin();

  const bankSheet = workbook.addWorksheet("بانک شماره‌ها", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  bankSheet.columns = [
    { header: "ردیف", key: "row", width: 8 },
    { header: "نام", key: "name", width: 24 },
    { header: "موبایل", key: "mobile", width: 16 },
    { header: "ثبت‌نام کرده", key: "registered", width: 16 },
    { header: "پایه", key: "grade", width: 16 },
    { header: "رشته", key: "major", width: 22 },
    { header: "تیم", key: "team", width: 20 },
    { header: "کد تیم", key: "teamCode", width: 14 },
    { header: "آزمون", key: "exam", width: 14 },
    { header: "تعداد دعوت برای این شماره", key: "inviteCount", width: 22 },
    { header: "آخرین دعوت‌کننده", key: "inviter", width: 24 },
    { header: "موبایل دعوت‌کننده", key: "inviterMobile", width: 18 },
    { header: "وضعیت آخرین دعوت", key: "invitationStatus", width: 20 },
    { header: "وضعیت آخرین پیامک", key: "smsStatus", width: 20 },
    { header: "منبع ثبت‌نام", key: "source", width: 18 },
    { header: "آخرین فعالیت", key: "lastActivity", width: 22 },
  ];
  phoneBankRows.forEach(({ mobile, entry, latestInvitation, latestSms, lastActivity }, index) => {
    bankSheet.addRow({
      row: index + 1,
      name: entry.participant?.fullName ?? latestInvitation?.inviteeName ?? "",
      mobile,
      registered: entry.participant ? "بله" : "خیر",
      grade: entry.participant?.gradeLabel ?? latestInvitation?.acceptedParticipant?.gradeLabel ?? "",
      major: entry.participant?.majorLabel ?? latestInvitation?.acceptedParticipant?.majorLabel ?? "",
      team: entry.participant?.team?.name ?? latestInvitation?.team.name ?? "",
      teamCode: entry.participant?.team?.inviteCode ?? latestInvitation?.team.inviteCode ?? "",
      exam: entry.participant?.completedAt ? "تکمیل کرده" : entry.participant ? "تکمیل نکرده" : "—",
      inviteCount: entry.invitations.length,
      inviter: latestInvitation?.inviter.fullName ?? "",
      inviterMobile: latestInvitation?.inviter.normalizedMobile ?? "",
      invitationStatus: latestInvitation ? INVITATION_STATUS_LABEL[latestInvitation.status] : "دعوت مستقیم ندارد",
      smsStatus: latestSms ? SMS_STATUS_LABEL[latestSms.status] : latestInvitation ? "پیامک ثبت نشده" : "—",
      source: entry.participant?.source ?? "دعوت ثبت‌شده",
      lastActivity: faDate(lastActivity),
    });
  });

  const invitationSheet = workbook.addWorksheet("دعوت‌ها و پیامک‌ها", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  invitationSheet.columns = [
    { header: "ردیف", key: "row", width: 8 },
    { header: "نام دوست", key: "name", width: 24 },
    { header: "موبایل دوست", key: "mobile", width: 16 },
    { header: "نام دعوت‌کننده", key: "inviter", width: 24 },
    { header: "موبایل دعوت‌کننده", key: "inviterMobile", width: 18 },
    { header: "تیم", key: "team", width: 20 },
    { header: "کد تیم", key: "teamCode", width: 14 },
    { header: "وضعیت دعوت", key: "invitationStatus", width: 20 },
    { header: "وضعیت پیامک", key: "smsStatus", width: 20 },
    { header: "سامانه پیامک", key: "provider", width: 16 },
    { header: "زمان ارسال پیامک", key: "smsSent", width: 22 },
    { header: "خطای پیامک", key: "smsError", width: 45 },
    { header: "ثبت‌نام کرده", key: "registered", width: 16 },
    { header: "نام ثبت‌نامی", key: "registeredName", width: 24 },
    { header: "پایه", key: "grade", width: 16 },
    { header: "رشته", key: "major", width: 22 },
    { header: "آزمون", key: "exam", width: 16 },
    { header: "تاریخ ثبت دعوت", key: "created", width: 22 },
    { header: "تاریخ پذیرش", key: "accepted", width: 22 },
    { header: "تاریخ انقضا", key: "expires", width: 22 },
  ];
  invitations.forEach((invitation, index) => {
    const sms = latestSmsByInvitation.get(invitation.id);
    invitationSheet.addRow({
      row: index + 1,
      name: invitation.inviteeName,
      mobile: invitation.normalizedMobile,
      inviter: invitation.inviter.fullName,
      inviterMobile: invitation.inviter.normalizedMobile,
      team: invitation.team.name,
      teamCode: invitation.team.inviteCode,
      invitationStatus: INVITATION_STATUS_LABEL[invitation.status],
      smsStatus: sms ? SMS_STATUS_LABEL[sms.status] : "پیامک ثبت نشده",
      provider: sms?.provider ?? "",
      smsSent: faDate(sms?.sentAt ?? null),
      smsError: sms?.lastError ?? "",
      registered: invitation.acceptedParticipant ? "بله" : "خیر",
      registeredName: invitation.acceptedParticipant?.fullName ?? "",
      grade: invitation.acceptedParticipant?.gradeLabel ?? "",
      major: invitation.acceptedParticipant?.majorLabel ?? "",
      exam: invitation.acceptedParticipant?.completedAt ? "تکمیل کرده" : invitation.acceptedParticipant ? "تکمیل نکرده" : "—",
      created: faDate(invitation.createdAt),
      accepted: faDate(invitation.acceptedAt),
      expires: faDate(invitation.expiresAt),
    });
  });

  const people = workbook.addWorksheet("شرکت‌کنندگان", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  people.columns = [
    { header: "ردیف", key: "row", width: 8 },
    { header: "نام و نام خانوادگی", key: "name", width: 24 },
    { header: "موبایل", key: "mobile", width: 16 },
    { header: "پایه", key: "grade", width: 16 },
    { header: "رشته", key: "major", width: 20 },
    { header: "تیم", key: "team", width: 18 },
    { header: "کد تیم", key: "teamCode", width: 14 },
    { header: "درصد آزمون", key: "percentage", width: 14 },
    { header: "امتیاز خام", key: "rawScore", width: 14 },
    { header: "حداکثر امتیاز", key: "maxScore", width: 16 },
    { header: "درست", key: "correct", width: 10 },
    { header: "غلط", key: "wrong", width: 10 },
    { header: "بی‌پاسخ", key: "unanswered", width: 10 },
    { header: "تاریخ آزمون", key: "submitted", width: 22 },
    { header: "وضعیت نتیجه", key: "result", width: 16 },
    { header: "شناسه لید CRM", key: "lead", width: 26 },
    { header: "وضعیت لید", key: "leadStatus", width: 16 },
    { header: "مسئول لید", key: "owner", width: 20 },
    { header: "شماره سریال گواهی", key: "certificateSerial", width: 24 },
    { header: "کد استعلام گواهی", key: "certificateCode", width: 22 },
    { header: "مشاهده گواهی", key: "certificateUrl", width: 20 },
    { header: "دانلود PDF گواهی", key: "certificatePdf", width: 22 },
    { header: "تاریخ صدور گواهی", key: "certificateIssued", width: 22 },
    { header: "تاریخ ثبت", key: "created", width: 22 },
  ];
  participants.forEach((participant, index) => {
    const attempt = participant.attempts[0];
    const certificate = participant.certificates[0];
    const certificateUrl = certificate
      ? `${challengeOrigin}/certificate/${certificate.verificationCode}`
      : "";
    people.addRow({
      row: index + 1,
      name: participant.fullName,
      mobile: participant.normalizedMobile,
      grade: participant.gradeLabel,
      major: participant.majorLabel ?? "—",
      team: participant.team?.name ?? "—",
      teamCode: participant.team?.inviteCode ?? "—",
      percentage: attempt?.percentage ?? "",
      rawScore: attempt?.rawScore ?? "",
      maxScore: attempt?.maxScore ?? "",
      correct: attempt?.correctCount ?? "",
      wrong: attempt?.wrongCount ?? "",
      unanswered: attempt?.unansweredCount ?? "",
      submitted: faDate(attempt?.submittedAt ?? null),
      result: participant.team?.resultUnlockedAt ? "بازشده" : "قفل",
      lead: participant.lead?.id ?? "",
      leadStatus: participant.lead?.status ?? "",
      owner: participant.lead?.owner
        ? `${participant.lead.owner.firstName} ${participant.lead.owner.lastName}`.trim()
        : "",
      certificateSerial: certificate?.serialNumber ?? "",
      certificateCode: certificate?.verificationCode ?? "",
      certificateUrl: certificateUrl ? { text: "مشاهده", hyperlink: certificateUrl } : "",
      certificatePdf: certificateUrl ? { text: "دانلود PDF", hyperlink: `${certificateUrl}/pdf` } : "",
      certificateIssued: faDate(certificate?.issuedAt ?? null),
      created: faDate(participant.createdAt),
    });
  });

  const teamSheet = workbook.addWorksheet("تیم‌ها و جوایز", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  teamSheet.columns = [
    { header: "ردیف", key: "row", width: 8 },
    { header: "نام تیم", key: "name", width: 20 },
    { header: "کد", key: "code", width: 14 },
    { header: "اعضا", key: "members", width: 10 },
    { header: "اعضای آزمون‌داده", key: "completed", width: 18 },
    { header: "دعوت‌ها", key: "invites", width: 10 },
    { header: "میانگین درصد", key: "average", width: 16 },
    { header: "امتیاز تیم", key: "score", width: 14 },
    { header: "سطح جایزه", key: "tier", width: 20 },
    { header: "جایزه", key: "prize", width: 28 },
    { header: "تعداد گواهی", key: "certificates", width: 16 },
    { header: "نتیجه", key: "result", width: 20 },
  ];
  teams.forEach((team, index) => teamSheet.addRow({
    row: index + 1,
    name: team.name,
    code: team.inviteCode,
    members: team._count.participants,
    completed: team.participants.filter((participant) => participant.completedAt).length,
    invites: team._count.invitations,
    average: team.averagePercentage ?? "",
    score: team.teamScore ?? "",
    tier: team.scholarshipTier?.title ?? "",
    prize: team.scholarshipTier?.prizeLabel ?? "",
    certificates: team._count.certificates,
    result: team.resultUnlockedAt ? faDate(team.resultUnlockedAt) : "قفل",
  }));

  for (const sheet of [bankSheet, invitationSheet, people, teamSheet]) {
    sheet.autoFilter = { from: "A1", to: sheet.getRow(1).getCell(sheet.columnCount).address };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;
    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: "middle", horizontal: rowNumber === 1 ? "center" : "right" };
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  }

  for (const columnKey of ["certificateUrl", "certificatePdf"]) {
    const column = people.getColumn(columnKey);
    column.eachCell((cell, rowNumber) => {
      if (rowNumber > 1 && cell.value) {
        cell.font = { color: { argb: "FF1D4ED8" }, underline: true };
      }
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.DATA_EXPORTED,
      entityType: "ChallengeCampaign",
      entityId: campaignId,
      metadata: {
        format: "xlsx",
        filters: { q, grade, major, status },
        participantCount: participants.length,
        invitationCount: invitations.length,
        uniqueMobileCount: phoneBankRows.length,
        teamCount: teams.length,
      },
    },
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`challenge-${campaign.slug}.xlsx`)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
