import type { PrismaClient } from "@/generated/prisma/client";
import { MODE_LABEL, gradeLabel, type NoticeKind } from "./constants";
import type { ConsultSettings } from "./settings-parse";
import { dispatchConsultMessage, type DispatchResult } from "./sms-send";
import { fa, jalaliDate } from "@/lib/format";
import { tehranHm } from "./time";

type Row = {
  code: string;
  mode: string;
  bookerName: string;
  studentName: string;
  grade: string;
  startsAt: Date;
  consultant: { name: string };
};

export function noticeParams(row: Row): Record<string, string> {
  return {
    NAME: row.bookerName,
    DATE: jalaliDate(row.startsAt),
    TIME: fa(tehranHm(row.startsAt)),
    MODE: MODE_LABEL[row.mode as keyof typeof MODE_LABEL] ?? row.mode,
    CONSULTANT: row.consultant.name,
    CODE: row.code,
    GRADE: gradeLabel(row.grade),
  };
}

function templateFor(kind: string, settings: ConsultSettings): number | null {
  if (kind === "CREATED") return settings.createdTemplateId;
  if (kind === "CANCELLED") return settings.cancelledTemplateId;
  if (kind === "MOVED") return settings.movedTemplateId;
  if (kind === "REMINDER") return settings.reminderTemplateId;
  return null;
}

/** Claim a queued notice and send it. A second caller finds it already claimed. */
export async function deliverNotice(db: PrismaClient, id: string, settings: ConsultSettings): Promise<DispatchResult | { status: "BUSY"; detail: null }> {
  const claimed = await db.consultNotice.updateMany({ where: { id, status: "QUEUED" }, data: { status: "SENDING" } });
  if (claimed.count !== 1) return { status: "BUSY", detail: null };
  const notice = await db.consultNotice.findUnique({ where: { id }, include: { consultation: { include: { consultant: true } } } });
  if (!notice?.consultation) {
    await db.consultNotice.update({ where: { id }, data: { status: "FAILED", detail: "نوبت پیدا نشد" } });
    return { status: "FAILED", detail: "نوبت پیدا نشد" };
  }
  const result = await dispatchConsultMessage({
    mobile: notice.mobile,
    body: notice.body,
    templateId: templateFor(notice.kind, settings),
    params: noticeParams(notice.consultation),
  });
  await db.consultNotice.update({
    where: { id },
    data: { status: result.status, detail: result.detail, sentAt: result.status === "SENT" ? new Date() : null },
  });
  await db.smsLog.create({ data: { kind: "consult", mobile: notice.mobile, status: result.status, detail: result.detail } }).catch(() => undefined);
  return result;
}

export async function requeueStuck(db: PrismaClient, olderThanMs = 5 * 60_000) {
  await db.consultNotice.updateMany({
    where: { status: "SENDING", createdAt: { lt: new Date(Date.now() - olderThanMs) } },
    data: { status: "QUEUED" },
  });
}

export type { NoticeKind };
