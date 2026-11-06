import "server-only";
import { prisma } from "@/lib/prisma";
import { gradeLabel, MODE_LABEL, type NoticeKind } from "./constants";
import { deliverNotice } from "./deliver";
import { getConsultSettings, type ConsultSettings } from "./settings";
import { renderSms } from "./text";
import { fa, jalaliDate } from "@/lib/format";
import { tehranHm } from "./time";

function bodyFor(kind: NoticeKind, settings: ConsultSettings, vars: Parameters<typeof renderSms>[1]): string {
  const template = kind === "CREATED" ? settings.smsCreated : kind === "CANCELLED" ? settings.smsCancelled : kind === "MOVED" ? settings.smsMoved : settings.smsReminder;
  return renderSms(template, vars);
}

export async function queueNotice(consultationId: string, kind: NoticeKind, settings?: ConsultSettings) {
  const cfg = settings ?? (await getConsultSettings());
  const row = await prisma.consultation.findUnique({ where: { id: consultationId }, include: { consultant: true } });
  if (!row) return null;
  if (kind === "REMINDER") {
    const existing = await prisma.consultNotice.findFirst({
      where: { consultationId, kind: "REMINDER", slotStartsAt: row.startsAt, status: { in: ["QUEUED", "SENDING", "SENT", "SKIPPED"] } },
      select: { id: true },
    });
    if (existing) return existing.id;
  }
  const vars = {
    name: row.bookerName,
    student: row.studentName,
    date: jalaliDate(row.startsAt),
    time: fa(tehranHm(row.startsAt)),
    mode: MODE_LABEL[row.mode as keyof typeof MODE_LABEL] ?? row.mode,
    consultant: row.consultant.name,
    code: row.code,
    grade: gradeLabel(row.grade),
  };
  const notice = await prisma.consultNotice.create({
    data: {
      consultationId,
      kind,
      mobile: row.mobile,
      body: bodyFor(kind, cfg, vars),
      status: "QUEUED",
      slotStartsAt: row.startsAt,
    },
  });
  return notice.id;
}

/** Queue the message and try to send it once. Booking is already saved; a failed SMS stays in the outbox. */
export async function queueAndSend(consultationId: string, kind: NoticeKind) {
  const settings = await getConsultSettings();
  const id = await queueNotice(consultationId, kind, settings);
  if (!id) return;
  await deliverNotice(prisma, id, settings);
}

export async function resendNotice(id: string) {
  const settings = await getConsultSettings();
  await prisma.consultNotice.updateMany({ where: { id, status: { in: ["FAILED", "SKIPPED"] } }, data: { status: "QUEUED", detail: null } });
  return deliverNotice(prisma, id, settings);
}
