/**
 * Pre-consultation reminders and a retry of the SMS outbox.
 *
 *   npm run consult:remind
 *   npm run consult:remind -- --dry-run
 *
 * Safe to run every 15 minutes from PM2 cron (the process must exit; autorestart off):
 *
 *   See DEPLOY.md for the PM2 cron line (every 15 minutes, autorestart off).
 *   pm2 save
 *
 * Reminders stay off until someone enables them in /admin/consult/settings.
 * No SMS is sent when SMS.ir is not configured; the notice is stored as SKIPPED.
 * Queued notices from confirm / cancel / reschedule are retried even when reminders are off.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { reminderDue } from "../lib/consult/access";
import { deliverNotice, requeueStuck } from "../lib/consult/deliver";
import { MODE_LABEL, gradeLabel } from "../lib/consult/constants";
import { parseConsultSettings } from "../lib/consult/settings-parse";
import { renderSms } from "../lib/consult/text";
import { fa, jalaliDate } from "../lib/format";
import { tehranHm } from "../lib/consult/time";

const DRY = process.argv.includes("--dry-run");
const log = (...a: unknown[]) => console.log("[consult-remind]", ...a);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    log("DATABASE_URL is missing");
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const row = await prisma.setting.findUnique({ where: { key: "consultation" } });
    const settings = parseConsultSettings(row?.value);
    await requeueStuck(prisma);
    const queued = await prisma.consultNotice.findMany({ where: { status: "QUEUED" }, select: { id: true }, take: 50 });
    log(`queued notices: ${queued.length}${DRY ? " (dry-run)" : ""}`);
    if (!DRY) {
      for (const n of queued) await deliverNotice(prisma, n.id, settings);
    }

    if (!settings.reminderEnabled) {
      log("reminders are off");
    } else {
      const now = new Date();
      const until = new Date(now.getTime() + settings.reminderHoursBefore * 3_600_000);
      const bookings = await prisma.consultation.findMany({
        where: { status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gt: now, lte: until } },
        include: { consultant: true, notices: { where: { kind: "REMINDER" }, select: { status: true, slotStartsAt: true } } },
        take: 200,
      });
      let sent = 0;
      for (const b of bookings) {
        const already = b.notices.some((n) => n.slotStartsAt?.getTime() === b.startsAt.getTime() && ["QUEUED", "SENDING", "SENT", "SKIPPED"].includes(n.status));
        if (!reminderDue(now, b.startsAt, settings.reminderHoursBefore, already)) continue;
        const body = renderSms(settings.smsReminder, {
          name: b.bookerName,
          student: b.studentName,
          date: jalaliDate(b.startsAt),
          time: fa(tehranHm(b.startsAt)),
          mode: MODE_LABEL[b.mode as keyof typeof MODE_LABEL] ?? b.mode,
          consultant: b.consultant.name,
          code: b.code,
          grade: gradeLabel(b.grade),
        });
        if (DRY) {
          log(`would remind ${b.code}`);
          continue;
        }
        const notice = await prisma.consultNotice.create({
          data: { consultationId: b.id, kind: "REMINDER", mobile: b.mobile, body, status: "QUEUED", slotStartsAt: b.startsAt },
        });
        await deliverNotice(prisma, notice.id, settings);
        sent++;
      }
      log(`reminders sent or queued: ${sent}`);
    }

    const old = new Date(Date.now() - 2 * 86_400_000);
    if (!DRY) {
      const removed = await prisma.consultCodeAttempt.deleteMany({ where: { createdAt: { lt: old } } });
      const otps = await prisma.consultOtp.deleteMany({ where: { expiresAt: { lt: old } } });
      log(`pruned attempts=${removed.count} otps=${otps.count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[consult-remind]", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
