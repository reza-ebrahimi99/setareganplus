/**
 * Idempotent legacy → CounselorSchedulePlan backfill (dry-run by default).
 *
 * Usage:
 *   tsx --env-file=.env scripts/counselor-schedule-v2-backfill.ts --dry-run
 *   tsx --env-file=.env scripts/counselor-schedule-v2-backfill.ts --execute
 */

import {
  CounselorSchedulePlanStatus,
  CounselorScheduleSessionKind,
} from "../generated/prisma/enums";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "../lib/counselor-os/constants";
import {
  readStoredPrograms,
  readCounselorSessionDurations,
  daysToWindowOverride,
  ymdToUtcNoon,
} from "../lib/counselor-os/schedule";
import { eachJalaliDayInRange } from "../lib/counselor-os/schedule-v2/backfill-utils";
import {
  gregorianYmdToDbDate,
  weekdayLabelForGregorianYmd,
} from "../lib/counselor-os/schedule-v2/local-date";
import { normalizeLocalTimeHm } from "../lib/datetime/tehran-zone";

const execute = process.argv.includes("--execute");
const dryRun = !execute;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Report = {
  skipped: Array<{ advisorId: string; reason: string }>;
  created: Array<{ advisorId: string; planId: string; kind: string }>;
};

async function main() {
  const advisors = await prisma.bookingAdvisor.count({ where: { deletedAt: null } });
  const rules = await prisma.bookingAvailabilityRule.count();
  const services = await prisma.bookingService.findMany({
    where: { slug: COUNSELOR_BOOKING_SERVICE_SLUG, deletedAt: null },
    select: { id: true, organizationId: true, settings: true },
  });

  let legacyPrograms = 0;
  for (const s of services) {
    const st = s.settings as Record<string, unknown>;
    const cp = st?.counselorPrograms;
    if (cp && typeof cp === "object") {
      legacyPrograms += Object.keys(cp as object).length;
    }
  }

  console.log(
    JSON.stringify(
      { phase: "pre-backfill-counts", advisors, rules, legacyPrograms, dryRun },
      null,
      2,
    ),
  );

  const report: Report = { skipped: [], created: [] };

  for (const service of services) {
    const settings = service.settings;
    const orgId = service.organizationId;
    const root =
      settings && typeof settings === "object"
        ? (settings as Record<string, unknown>)
        : {};
    const byAdvisor =
      root.counselorPrograms && typeof root.counselorPrograms === "object"
        ? (root.counselorPrograms as Record<string, unknown>)
        : {};

    for (const advisorId of Object.keys(byAdvisor)) {
      const legacyKey = `legacy:${orgId}:${advisorId}`;
      const existing = await prisma.counselorSchedulePlan.findFirst({
        where: { organizationId: orgId, legacySourceKey: legacyKey },
      });
      if (existing) {
        report.skipped.push({ advisorId, reason: "already migrated" });
        continue;
      }

      const stored = readStoredPrograms(settings, advisorId);
      if (!stored) {
        report.skipped.push({ advisorId, reason: "no stored program" });
        continue;
      }
      const durations = readCounselorSessionDurations(settings, advisorId);

      async function migrateKind(
        kind: CounselorScheduleSessionKind,
        days: NonNullable<typeof stored>["firstDays"],
        fromYmd: string,
        untilYmd: string,
        minutes: number,
      ) {
        if (!days?.some((d) => d.enabled)) {
          report.skipped.push({ advisorId, reason: `no enabled days ${kind}` });
          return;
        }
        const from = ymdToUtcNoon(fromYmd);
        const until = ymdToUtcNoon(untilYmd);
        if (!from || !until) {
          report.skipped.push({ advisorId, reason: "invalid date range" });
          return;
        }
        const overrides = daysToWindowOverride(days, from, until);
        const expanded = eachJalaliDayInRange(fromYmd, untilYmd, overrides);
        if (expanded.length === 0) {
          report.skipped.push({ advisorId, reason: "expand empty" });
          return;
        }

        const sourceKey = `${legacyKey}:${kind}`;
        const conflict = await prisma.counselorSchedulePlan.findFirst({
          where: {
            organizationId: orgId,
            advisorId,
            sessionKind: kind,
            status: CounselorSchedulePlanStatus.ACTIVE,
          },
        });
        if (conflict) {
          report.skipped.push({
            advisorId,
            reason: `active v2 plan exists for ${kind}`,
          });
          return;
        }

        if (dryRun) {
          report.created.push({
            advisorId,
            planId: `(dry-run) ${sourceKey}`,
            kind,
          });
          return;
        }

        const plan = await prisma.counselorSchedulePlan.create({
          data: {
            organizationId: orgId,
            advisorId,
            sessionKind: kind,
            status: CounselorSchedulePlanStatus.ACTIVE,
            sessionMinutes: minutes,
            legacySourceKey: sourceKey,
            legacyMeta: { fromYmd, untilYmd, migratedAt: new Date().toISOString() },
            activatedAt: new Date(),
          },
        });

        for (let i = 0; i < expanded.length; i += 1) {
          const row = expanded[i]!;
          const dbDate = gregorianYmdToDbDate(row.gregorianYmd);
          if (!dbDate) continue;
          const day = await prisma.counselorScheduleDay.create({
            data: {
              organizationId: orgId,
              planId: plan.id,
              localDate: dbDate,
              weekdayLabel: weekdayLabelForGregorianYmd(row.gregorianYmd),
              sortOrder: i,
            },
          });
          for (let w = 0; w < row.windows.length; w += 1) {
            const win = row.windows[w]!;
            await prisma.counselorScheduleWindow.create({
              data: {
                organizationId: orgId,
                dayId: day.id,
                startLocalTime:
                  normalizeLocalTimeHm(win.startLocalTime) ?? win.startLocalTime,
                endLocalTime:
                  normalizeLocalTimeHm(win.endLocalTime) ?? win.endLocalTime,
                sortOrder: w,
              },
            });
          }
        }

        report.created.push({ advisorId, planId: plan.id, kind });
      }

      if (stored.firstValidFromYmd && stored.firstValidUntilYmd) {
        await migrateKind(
          CounselorScheduleSessionKind.FIRST_SESSION,
          stored.firstDays,
          stored.firstValidFromYmd,
          stored.firstValidUntilYmd,
          durations.firstSessionMinutes,
        );
      }
      if (
        (stored.secondValidFromYmd || stored.firstValidFromYmd) &&
        (stored.secondValidUntilYmd || stored.firstValidUntilYmd)
      ) {
        await migrateKind(
          CounselorScheduleSessionKind.SECOND_SESSION,
          stored.secondDays,
          stored.secondValidFromYmd || stored.firstValidFromYmd!,
          stored.secondValidUntilYmd || stored.firstValidUntilYmd!,
          durations.secondSessionMinutes,
        );
      }
    }
  }

  console.log(JSON.stringify({ phase: "backfill-result", report }, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
