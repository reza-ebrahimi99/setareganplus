/**
 * Soft-delete every lead that is not already soft-deleted.
 *
 * Never hard-deletes. Registrations, payments, and orders stay in place;
 * the admin panel hides leads whose deletedAt is set.
 *
 * Refuses to run unless a leads-full-export workbook exists and its
 * exportedAt (inside the file, not the filesystem mtime) is within 24 hours.
 *
 * Dry-run is the default and writes nothing:
 *   npx tsx scripts/leads-soft-delete-all.ts --backup /var/backups/setareganplus/leads-full-….xlsx
 *   npx tsx scripts/leads-soft-delete-all.ts --backup /var/backups/setareganplus/leads-full-….xlsx --confirm
 *
 * DATABASE_URL must already be in the environment.
 */

import { AuditAction } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import {
  assertKnownArgs,
  parseArgs,
  readLeadBackup,
  resolveBackupPath,
} from "./leads-backup-shared";

const ALLOWED = ["backup", "confirm", "dry-run", "actor-user-id"] as const;

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  assertKnownArgs(parsed, ALLOWED);
  if (parsed.values.has("confirm") || parsed.values.has("dry-run")) {
    throw new Error("--confirm و --dry-run مقدار نمی‌گیرند.");
  }
  if (parsed.flags.has("confirm") && parsed.flags.has("dry-run")) {
    throw new Error("هر دو نشانه --confirm و --dry-run با هم مجاز نیست.");
  }

  const dryRun = !parsed.flags.has("confirm");
  const backupPath = await resolveBackupPath(parsed.values.get("backup"));
  const backup = await readLeadBackup(backupPath);
  const actorUserId = parsed.values.get("actor-user-id") ?? null;
  if (actorUserId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true },
    });
    if (!actor) {
      throw new Error("کاربر داده‌شده با --actor-user-id پیدا نشد.");
    }
  }

  const active = await prisma.lead.count({ where: { deletedAt: null } });
  const alreadySoftDeleted = await prisma.lead.count({
    where: { deletedAt: { not: null } },
  });

  console.log(`MODE=${dryRun ? "dry-run" : "confirm"}`);
  console.log(`BACKUP_PATH=${backupPath}`);
  console.log(`BACKUP_EXPORTED_AT=${backup.exportedAt.toISOString()}`);
  console.log(`leads_active=${active}`);
  console.log(`leads_already_soft_deleted=${alreadySoftDeleted}`);

  if (dryRun) {
    console.log(`would_update=${active}`);
    console.log("چیزی نوشته نشد.");
    return;
  }

  const now = new Date();
  const result = await prisma.$transaction(
    async (tx) => {
      const groups = await tx.lead.groupBy({
        by: ["organizationId"],
        where: { deletedAt: null },
        _count: { _all: true },
      });
      const activeNow = groups.reduce((sum, group) => sum + group._count._all, 0);
      const updated = await tx.lead.updateMany({
        where: { deletedAt: null },
        data: { deletedAt: now },
      });
      if (updated.count !== activeNow) {
        throw new Error("شمار متقاضیان فعال هنگام نوشتن عوض شد. دوباره اجرا کنید.");
      }

      const auditTargets =
        groups.length > 0
          ? groups.map((group) => ({
              organizationId: group.organizationId,
              affectedCount: group._count._all,
            }))
          : [{ organizationId: null as string | null, affectedCount: 0 }];

      for (const target of auditTargets) {
        await tx.auditLog.create({
          data: {
            organizationId: target.organizationId,
            actorUserId,
            action: AuditAction.CRM_LEAD_UPDATED,
            entityType: "Lead",
            entityId: null,
            metadata: {
              script: "leads-soft-delete-all",
              operation: "soft-delete-all",
              backupPath,
              backupExportedAt: backup.exportedAt.toISOString(),
              affectedCount: target.affectedCount,
              totalAffected: updated.count,
              alreadySoftDeletedBefore: alreadySoftDeleted,
              hardDelete: false,
            },
          },
        });
      }

      return { updated: updated.count, auditRows: auditTargets.length };
    },
    { timeout: 120_000, maxWait: 15_000 },
  );

  console.log(`updated=${result.updated}`);
  console.log(`audit_rows=${result.auditRows}`);
  console.log("حذف نرم انجام شد. ردیفی پاک نشد.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
