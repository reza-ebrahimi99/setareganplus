import type { Prisma } from "@/generated/prisma/client";
import {
  AuditAction,
  CrmActivityType,
  LeadSourceType,
} from "@/generated/prisma/enums";
import { permissionsForRole } from "@/lib/auth/permissions";
import { recordCrmActivity } from "@/lib/crm/activity";
import {
  buildImportResultCsv,
  type ImportDuplicateStrategy,
  type ImportProfile,
  type ImportResultCsvRow,
  type InvalidImportRow,
  type ValidImportRow,
} from "@/lib/crm/import-parser";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { prisma } from "@/lib/prisma";

const READ_BATCH_SIZE = 500;
const WRITE_BATCH_SIZE = 50;

export type CrmImportActor = {
  organizationId: string;
  membershipId: string;
  userId: string;
  isPlatformAdmin: boolean;
};

export type CrmImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  failed: number;
  rows: ImportResultCsvRow[];
  csv: string;
};

type ExistingLead = {
  id: string;
  deletedAt: Date | null;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  school: string | null;
  gradeLevel: string | null;
  studyField: string | null;
  city: string | null;
  province: string | null;
  gender: "MALE" | "FEMALE" | "UNSPECIFIED" | null;
  birthDate: Date | null;
  nationalCode: string | null;
  description: string | null;
  metadata: Prisma.JsonValue | null;
};

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function displayName(profile: ImportProfile): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

function isEmptyText(value: string | null): boolean {
  return value === null || value.trim() === "";
}

function metadataObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, Prisma.JsonValue>;
}

export function buildSafeEmptyFieldUpdate(
  existing: ExistingLead,
  incoming: ImportProfile,
): Prisma.LeadUpdateInput {
  const data: Prisma.LeadUpdateInput = {};
  if (isEmptyText(existing.firstName) && incoming.firstName) data.firstName = incoming.firstName;
  if (isEmptyText(existing.lastName) && incoming.lastName) data.lastName = incoming.lastName;
  if (isEmptyText(existing.fatherName) && incoming.fatherName) data.fatherName = incoming.fatherName;
  if (isEmptyText(existing.school) && incoming.school) data.school = incoming.school;
  if (isEmptyText(existing.gradeLevel) && incoming.gradeLevel) data.gradeLevel = incoming.gradeLevel;
  if (isEmptyText(existing.studyField) && incoming.studyField) data.studyField = incoming.studyField;
  if (isEmptyText(existing.city) && incoming.city) data.city = incoming.city;
  if (isEmptyText(existing.province) && incoming.province) data.province = incoming.province;
  if (existing.gender === null && incoming.gender) data.gender = incoming.gender;
  if (existing.birthDate === null && incoming.birthDate) data.birthDate = incoming.birthDate;
  if (isEmptyText(existing.nationalCode) && incoming.nationalCode) {
    data.nationalCode = incoming.nationalCode;
  }
  if (isEmptyText(existing.description) && incoming.description) {
    data.description = incoming.description;
  }

  const metadata = metadataObject(existing.metadata);
  if (
    incoming.importedEmail &&
    metadata &&
    !Object.prototype.hasOwnProperty.call(metadata, "importedEmail")
  ) {
    data.metadata = {
      ...metadata,
      importedEmail: incoming.importedEmail,
    } satisfies Prisma.InputJsonObject;
  } else if (incoming.importedEmail && existing.metadata === null) {
    data.metadata = {
      importedEmail: incoming.importedEmail,
    } satisfies Prisma.InputJsonObject;
  }
  return data;
}

function hasUpdate(data: Prisma.LeadUpdateInput): boolean {
  return Object.keys(data).length > 0;
}

async function loadExistingLeads(
  organizationId: string,
  mobiles: readonly string[],
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Map<string, ExistingLead[]>> {
  const map = new Map<string, ExistingLead[]>();
  for (const mobileBatch of chunks([...new Set(mobiles)], READ_BATCH_SIZE)) {
    const matches = await client.lead.findMany({
      where: {
        organizationId,
        normalizedMobile: { in: mobileBatch },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        normalizedMobile: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        fatherName: true,
        school: true,
        gradeLevel: true,
        studyField: true,
        city: true,
        province: true,
        gender: true,
        birthDate: true,
        nationalCode: true,
        description: true,
        metadata: true,
      },
    });
    for (const lead of matches) {
      if (!lead.normalizedMobile) continue;
      const bucket = map.get(lead.normalizedMobile) ?? [];
      bucket.push(lead);
      map.set(lead.normalizedMobile, bucket);
    }
  }
  return map;
}

async function lockMobiles(
  tx: Prisma.TransactionClient,
  organizationId: string,
  mobiles: readonly string[],
): Promise<void> {
  for (const mobile of [...new Set(mobiles)].sort()) {
    const key = `manual-lead:phone:${organizationId}:${mobile}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }
}

async function assertImportContext(params: {
  actor: CrmImportActor;
  branchId: string;
}): Promise<void> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      id: params.actor.membershipId,
      organizationId: params.actor.organizationId,
      userId: params.actor.userId,
      status: "ACTIVE",
      deletedAt: null,
      organization: { isActive: true, deletedAt: null },
      user: { status: "ACTIVE", deletedAt: null },
    },
    select: {
      role: true,
      branchMemberships: {
        where: { deletedAt: null },
        select: { branchId: true },
      },
    },
  });
  if (!membership) throw new Error("نشست مدیریت معتبر نیست.");
  if (
    !params.actor.isPlatformAdmin &&
    !permissionsForRole(membership.role).has("crm.import_leads")
  ) {
    throw new Error("اجازه ورود گروهی لیدها را ندارید.");
  }
  const branchIds = membership.branchMemberships.map((item) => item.branchId);
  const branch = await prisma.branch.findFirst({
    where: {
      id: params.branchId,
      organizationId: params.actor.organizationId,
      isActive: true,
      deletedAt: null,
      ...(branchIds.length === 0 ? {} : { id: { in: branchIds } }),
    },
    select: { id: true },
  });
  if (!branch) throw new Error("شعبه انتخاب‌شده در محدوده دسترسی شما نیست.");
}

function invalidResultRows(rows: readonly InvalidImportRow[]): ImportResultCsvRow[] {
  return rows.map((row) => ({
    excelRowNumber: row.excelRowNumber,
    status: "نامعتبر",
    mobile: row.mobile,
    name: row.name,
    message: row.errors.join(" "),
  }));
}

export async function importCrmLeads(params: {
  actor: CrmImportActor;
  branchId: string;
  strategy: ImportDuplicateStrategy;
  validRows: readonly ValidImportRow[];
  invalidRows: readonly InvalidImportRow[];
}): Promise<CrmImportResult> {
  await assertImportContext({ actor: params.actor, branchId: params.branchId });
  const pipeline = await ensureDefaultPipeline(params.actor.organizationId);
  const resultRows = invalidResultRows(params.invalidRows);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const rowBatch of chunks(params.validRows, WRITE_BATCH_SIZE)) {
    try {
      const batchResults = await prisma.$transaction(async (tx) => {
        let batchCreated = 0;
        let batchUpdated = 0;
        let batchSkipped = 0;
        await lockMobiles(
          tx,
          params.actor.organizationId,
          rowBatch.map((row) => row.profile.mobile),
        );
        const existingByMobile = await loadExistingLeads(
          params.actor.organizationId,
          rowBatch.map((row) => row.profile.mobile),
          tx,
        );
        const rows: ImportResultCsvRow[] = [];

        for (const row of rowBatch) {
          const matches = existingByMobile.get(row.profile.mobile) ?? [];
          const softDeleted = matches.some((lead) => lead.deletedAt !== null);
          const active = matches.filter((lead) => lead.deletedAt === null);

          if (softDeleted) {
            batchSkipped += 1;
            rows.push({
              excelRowNumber: row.excelRowNumber,
              status: "تکراری",
              mobile: row.profile.mobile,
              name: displayName(row.profile),
              message: "لید حذف‌شده با این موبایل وجود دارد؛ ردیف رد شد.",
            });
            continue;
          }
          if (active.length > 1) {
            batchSkipped += 1;
            rows.push({
              excelRowNumber: row.excelRowNumber,
              status: "تکراری مبهم",
              mobile: row.profile.mobile,
              name: displayName(row.profile),
              message: "چند لید فعال با این موبایل وجود دارد؛ تغییری اعمال نشد.",
            });
            continue;
          }
          if (active.length === 1) {
            const existing = active[0]!;
            if (params.strategy === "SKIP") {
              batchSkipped += 1;
              rows.push({
                excelRowNumber: row.excelRowNumber,
                status: "رد شد",
                mobile: row.profile.mobile,
                name: displayName(row.profile),
                message: "موبایل قبلاً در CRM ثبت شده است.",
              });
              continue;
            }

            const data = buildSafeEmptyFieldUpdate(existing, row.profile);
            if (!hasUpdate(data)) {
              batchSkipped += 1;
              rows.push({
                excelRowNumber: row.excelRowNumber,
                status: "بدون تغییر",
                mobile: row.profile.mobile,
                name: displayName(row.profile),
                message: "فیلد خالی قابل تکمیلی وجود نداشت.",
              });
              continue;
            }
            await tx.lead.update({
              where: {
                organizationId_id: {
                  organizationId: params.actor.organizationId,
                  id: existing.id,
                },
              },
              data,
            });
            await recordCrmActivity({
              organizationId: params.actor.organizationId,
              leadId: existing.id,
              activityType: CrmActivityType.NOTE_ADDED,
              title: "تکمیل اطلاعات از ورود Excel/CSV",
              actorUserId: params.actor.userId,
              metadata: { excelRowNumber: row.excelRowNumber },
              tx,
            });
            await tx.auditLog.create({
              data: {
                organizationId: params.actor.organizationId,
                branchId: params.branchId,
                actorUserId: params.actor.userId,
                action: AuditAction.CRM_LEAD_UPDATED,
                entityType: "Lead",
                entityId: existing.id,
                metadata: {
                  source: "CRM_EXCEL_IMPORT",
                  excelRowNumber: row.excelRowNumber,
                  filledFields: Object.keys(data),
                },
              },
            });
            batchUpdated += 1;
            rows.push({
              excelRowNumber: row.excelRowNumber,
              status: "به‌روزرسانی شد",
              mobile: row.profile.mobile,
              name: displayName(row.profile),
              message: "فقط فیلدهای خالی مجاز تکمیل شدند.",
            });
            continue;
          }

          const metadata: Record<string, string | number> = {
            importRowNumber: row.excelRowNumber,
          };
          if (row.profile.importedEmail) {
            metadata.importedEmail = row.profile.importedEmail;
          }
          if (row.profile.importedSource) {
            metadata.importedSource = row.profile.importedSource;
          }
          const lead = await tx.lead.create({
            data: {
              organizationId: params.actor.organizationId,
              branchId: params.branchId,
              firstName: row.profile.firstName,
              lastName: row.profile.lastName,
              fatherName: row.profile.fatherName,
              mobile: row.profile.mobile,
              mobileRaw: row.profile.mobileRaw,
              normalizedMobile: row.profile.mobile,
              nationalCode: row.profile.nationalCode,
              school: row.profile.school,
              gradeLevel: row.profile.gradeLevel,
              studyField: row.profile.studyField,
              city: row.profile.city,
              province: row.profile.province,
              gender: row.profile.gender,
              birthDate: row.profile.birthDate,
              description: row.profile.description,
              source: "CRM_EXCEL_IMPORT",
              sourceType: LeadSourceType.IMPORT,
              pipelineId: pipeline.pipelineId,
              stageId: pipeline.newStageId,
              metadata: metadata as Prisma.InputJsonObject,
            },
            select: { id: true },
          });
          await recordCrmActivity({
            organizationId: params.actor.organizationId,
            leadId: lead.id,
            activityType: CrmActivityType.LEAD_CREATED,
            title: "لید از Excel/CSV ایجاد شد",
            summary: "CRM_EXCEL_IMPORT",
            actorUserId: params.actor.userId,
            metadata: { excelRowNumber: row.excelRowNumber },
            tx,
          });
          await tx.auditLog.create({
            data: {
              organizationId: params.actor.organizationId,
              branchId: params.branchId,
              actorUserId: params.actor.userId,
              action: AuditAction.CRM_LEAD_CREATED,
              entityType: "Lead",
              entityId: lead.id,
              metadata: {
                source: "CRM_EXCEL_IMPORT",
                sourceType: LeadSourceType.IMPORT,
                excelRowNumber: row.excelRowNumber,
              },
            },
          });
          batchCreated += 1;
          rows.push({
            excelRowNumber: row.excelRowNumber,
            status: "ایجاد شد",
            mobile: row.profile.mobile,
            name: displayName(row.profile),
            message: "لید جدید با موفقیت ثبت شد.",
          });
        }
        return {
          rows,
          created: batchCreated,
          updated: batchUpdated,
          skipped: batchSkipped,
        };
      });
      created += batchResults.created;
      updated += batchResults.updated;
      skipped += batchResults.skipped;
      resultRows.push(...batchResults.rows);
    } catch {
      failed += rowBatch.length;
      resultRows.push(
        ...rowBatch.map((row) => ({
          excelRowNumber: row.excelRowNumber,
          status: "خطا",
          mobile: row.profile.mobile,
          name: displayName(row.profile),
          message: "ثبت این دسته انجام نشد؛ هیچ‌یک از ردیف‌های دسته ذخیره نشد.",
        })),
      );
    }
  }

  resultRows.sort((a, b) => a.excelRowNumber - b.excelRowNumber);
  return {
    total: params.validRows.length + params.invalidRows.length,
    created,
    updated,
    skipped,
    invalid: params.invalidRows.length,
    failed,
    rows: resultRows,
    csv: buildImportResultCsv(resultRows),
  };
}
