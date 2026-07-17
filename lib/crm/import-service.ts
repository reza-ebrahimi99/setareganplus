import type { Prisma } from "@/generated/prisma/client";
import { randomUUID } from "node:crypto";
import {
  AuditAction,
  CrmActivityType,
  LeadSourceType,
  SystemRole,
} from "@/generated/prisma/enums";
import { permissionsForRole } from "@/lib/auth/permissions";
import {
  buildImportResultCsv,
  type ImportDuplicateStrategy,
  type ImportProfile,
  type ImportResultCsvRow,
  type InvalidImportRow,
  type ValidImportRow,
} from "@/lib/crm/import-parser";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import {
  buildImportAssignmentPlan,
  type ImportAssignmentConfig,
} from "@/lib/crm/import-assignment";
import {
  isEligibleLeadOwner,
  setLeadOwnersBulk,
} from "@/lib/crm/lead-ownership";
import { prisma } from "@/lib/prisma";

const READ_BATCH_SIZE = 500;
const WRITE_BATCH_SIZE = 500;

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
  duplicates: number;
  ownerDistribution: Array<{
    ownerUserId: string | null;
    ownerName: string;
    count: number;
  }>;
  rows: ImportResultCsvRow[];
  csv: string;
};

type ExistingLead = {
  id: string;
  branchId: string;
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
        branchId: true,
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
  const keys = [...new Set(mobiles)]
    .sort()
    .map((mobile) => `manual-lead:phone:${organizationId}:${mobile}`);
  if (keys.length === 0) return;
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtext(lock_key))
    FROM unnest(${keys}::text[]) AS lock_key
    ORDER BY lock_key
  `;
}

async function assertImportContext(params: {
  actor: CrmImportActor;
  branchId: string;
}): Promise<{
  role: SystemRole;
  isPlatformAdmin: boolean;
  allBranches: boolean;
  branchIds: string[];
}> {
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
      user: { select: { isPlatformAdmin: true } },
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
  return {
    role: membership.role,
    isPlatformAdmin: membership.user.isPlatformAdmin,
    allBranches: branchIds.length === 0,
    branchIds,
  };
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

export type CrmImportPreviewRow = {
  excelRowNumber: number;
  mobile: string;
  name: string;
  status: "NEW" | "DUPLICATE" | "INVALID";
  message: string;
};

export type CrmImportPreflight = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  newLeads: number;
  preview: CrmImportPreviewRow[];
  errors: Array<{
    excelRowNumber: number;
    mobile: string;
    name: string;
    message: string;
  }>;
};

function comparableParentName(value: string | null): string {
  return (value ?? "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa");
}

function duplicateMatches(
  existing: ExistingLead,
  row: ValidImportRow,
  matchParentName: boolean,
): boolean {
  if (!matchParentName) return true;
  const incoming = comparableParentName(row.profile.fatherName);
  const current = comparableParentName(existing.fatherName);
  return Boolean(incoming && current && incoming === current);
}

export async function preflightCrmImport(params: {
  organizationId: string;
  validRows: readonly ValidImportRow[];
  invalidRows: readonly InvalidImportRow[];
  matchParentName?: boolean;
}): Promise<CrmImportPreflight> {
  const existingByMobile = await loadExistingLeads(
    params.organizationId,
    params.validRows.map((row) => row.profile.mobile),
  );
  const seen = new Map<string, ValidImportRow[]>();
  const classified = params.validRows.map((row): CrmImportPreviewRow => {
    const databaseMatches = (existingByMobile.get(row.profile.mobile) ?? []).filter(
      (lead) => duplicateMatches(lead, row, Boolean(params.matchParentName)),
    );
    const fileMatches = (seen.get(row.profile.mobile) ?? []).filter((previous) => {
      if (!params.matchParentName) return true;
      return (
        comparableParentName(previous.profile.fatherName) ===
          comparableParentName(row.profile.fatherName) &&
        comparableParentName(row.profile.fatherName) !== ""
      );
    });
    const bucket = seen.get(row.profile.mobile) ?? [];
    bucket.push(row);
    seen.set(row.profile.mobile, bucket);
    const duplicate = databaseMatches.length > 0 || fileMatches.length > 0;
    return {
      excelRowNumber: row.excelRowNumber,
      mobile: row.profile.mobile,
      name: displayName(row.profile),
      status: duplicate ? "DUPLICATE" : "NEW",
      message: duplicate ? "موبایل تکراری شناسایی شد." : "لید جدید",
    };
  });
  const invalidPreview: CrmImportPreviewRow[] = params.invalidRows.map((row) => ({
    excelRowNumber: row.excelRowNumber,
    mobile: row.mobile,
    name: row.name,
    status: "INVALID",
    message: row.errors.join(" "),
  }));
  const allPreview = [...classified, ...invalidPreview]
    .sort((a, b) => a.excelRowNumber - b.excelRowNumber)
    .slice(0, 20);
  const duplicates = classified.filter((row) => row.status === "DUPLICATE").length;
  return {
    total: params.validRows.length + params.invalidRows.length,
    valid: params.validRows.length,
    invalid: params.invalidRows.length,
    duplicates,
    newLeads: params.validRows.length - duplicates,
    preview: allPreview,
    errors: params.invalidRows.slice(0, 100).map((row) => ({
      excelRowNumber: row.excelRowNumber,
      mobile: row.mobile,
      name: row.name,
      message: row.errors.join(" "),
    })),
  };
}

export async function importCrmLeads(params: {
  actor: CrmImportActor;
  branchId: string;
  strategy: ImportDuplicateStrategy;
  validRows: readonly ValidImportRow[];
  invalidRows: readonly InvalidImportRow[];
  assignment?: ImportAssignmentConfig;
  matchParentName?: boolean;
}): Promise<CrmImportResult> {
  const context = await assertImportContext({
    actor: params.actor,
    branchId: params.branchId,
  });
  const canImportDuplicates =
    context.isPlatformAdmin ||
    context.role === SystemRole.PLATFORM_ADMIN ||
    context.role === SystemRole.ORGANIZATION_OWNER ||
    context.role === SystemRole.ORGANIZATION_ADMIN;
  if (params.strategy === "IMPORT_ANYWAY" && !canImportDuplicates) {
    throw new Error("فقط مدیران ارشد می‌توانند لید تکراری را وارد کنند.");
  }
  const seenImportKeys = new Set<string>();
  const fileDuplicateRows = new Set<number>();
  for (const row of params.validRows) {
    const parentName = comparableParentName(row.profile.fatherName);
    const key =
      params.matchParentName && !parentName
        ? `${row.profile.mobile}:row:${row.excelRowNumber}`
        : params.matchParentName
          ? `${row.profile.mobile}:${parentName}`
          : row.profile.mobile;
    if (seenImportKeys.has(key)) fileDuplicateRows.add(row.excelRowNumber);
    else seenImportKeys.add(key);
  }
  const initialExisting = await loadExistingLeads(
    params.actor.organizationId,
    params.validRows.map((row) => row.profile.mobile),
  );
  const detectedDuplicates = params.validRows.filter(
    (row) =>
      fileDuplicateRows.has(row.excelRowNumber) ||
      (initialExisting.get(row.profile.mobile) ?? []).some((lead) =>
        duplicateMatches(lead, row, Boolean(params.matchParentName)),
      ),
  ).length;
  const plannedCreateRows = params.validRows.filter((row) => {
    if (params.strategy === "IMPORT_ANYWAY") return true;
    if (fileDuplicateRows.has(row.excelRowNumber)) return false;
    return !(initialExisting.get(row.profile.mobile) ?? []).some((lead) =>
      duplicateMatches(lead, row, Boolean(params.matchParentName)),
    );
  });
  const assignment = params.assignment ?? { method: "NONE" as const };
  const assignmentPlan = buildImportAssignmentPlan(
    plannedCreateRows.length,
    assignment,
  );
  if (!assignmentPlan.ok) throw new Error(assignmentPlan.error);
  const selectedOwnerIds = [
    ...new Set(assignmentPlan.ownerUserIds.filter((id): id is string => Boolean(id))),
  ];
  if (
    selectedOwnerIds.length > 0 &&
    !context.isPlatformAdmin &&
    !permissionsForRole(context.role).has("crm.assign")
  ) {
    throw new Error("اجازه تخصیص مسئول در ورود گروهی را ندارید.");
  }
  for (const ownerUserId of selectedOwnerIds) {
    const eligible = await isEligibleLeadOwner({
      organizationId: params.actor.organizationId,
      branchId: params.branchId,
      userId: ownerUserId,
    });
    if (!eligible) {
      throw new Error("یکی از مسئولان انتخاب‌شده برای شعبه مقصد معتبر نیست.");
    }
  }
  const pipeline = await ensureDefaultPipeline(params.actor.organizationId);
  const plannedRowOwner = new Map(
    plannedCreateRows.map((row, index) => [
      row.excelRowNumber,
      assignmentPlan.ownerUserIds[index] ?? null,
    ]),
  );
  const rowOwner = plannedRowOwner;
  const resultRows = invalidResultRows(params.invalidRows);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const duplicates = detectedDuplicates;
  let failed = 0;
  const ownerCounts = new Map<string | null, number>();
  const ownerNameRows = selectedOwnerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: selectedOwnerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const ownerNames = new Map(
    ownerNameRows.map((user) => [
      user.id,
      `${user.firstName} ${user.lastName}`.trim(),
    ]),
  );
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
        const pendingCreates: Array<{
          leadId: string;
          row: ValidImportRow;
          ownerUserId: string | null;
          duplicateOfId: string | null;
        }> = [];
        const pendingUpdates: Array<{
          leadId: string;
          branchId: string;
          row: ValidImportRow;
          data: Prisma.LeadUpdateInput;
        }> = [];

        for (const row of rowBatch) {
          const matches = (existingByMobile.get(row.profile.mobile) ?? []).filter(
            (lead) =>
              duplicateMatches(lead, row, Boolean(params.matchParentName)),
          );
          const softDeleted = matches.some((lead) => lead.deletedAt !== null);
          const active = matches.filter((lead) => lead.deletedAt === null);
          const duplicateInFile = fileDuplicateRows.has(row.excelRowNumber);

          if (duplicateInFile && params.strategy !== "IMPORT_ANYWAY") {
            batchSkipped += 1;
            rows.push({
              excelRowNumber: row.excelRowNumber,
              status: "تکراری",
              mobile: row.profile.mobile,
              name: displayName(row.profile),
              message: "این موبایل پیش‌تر در همین فایل تکرار شده است.",
            });
            continue;
          }
          if (
            softDeleted &&
            active.length === 0 &&
            params.strategy !== "IMPORT_ANYWAY"
          ) {
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
          if (active.length > 1 && params.strategy !== "IMPORT_ANYWAY") {
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
          if (active.length === 1 && params.strategy !== "IMPORT_ANYWAY") {
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
            if (
              !context.allBranches &&
              !context.branchIds.includes(existing.branchId)
            ) {
              batchSkipped += 1;
              rows.push({
                excelRowNumber: row.excelRowNumber,
                status: "خارج از دسترسی",
                mobile: row.profile.mobile,
                name: displayName(row.profile),
                message: "لید تکراری در شعبه‌ای خارج از محدوده دسترسی شما قرار دارد.",
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
            pendingUpdates.push({
              leadId: existing.id,
              branchId: existing.branchId,
              row,
              data,
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

          pendingCreates.push({
            leadId: randomUUID(),
            row,
            ownerUserId: rowOwner.get(row.excelRowNumber) ?? null,
            duplicateOfId:
              params.strategy === "IMPORT_ANYWAY"
                ? active[0]?.id ?? matches[0]?.id ?? null
                : null,
          });
        }

        if (pendingUpdates.length > 0) {
          await Promise.all(
            pendingUpdates.map((item) =>
              tx.lead.update({
                where: {
                  organizationId_id: {
                    organizationId: params.actor.organizationId,
                    id: item.leadId,
                  },
                },
                data: item.data,
              }),
            ),
          );
          await tx.crmActivity.createMany({
            data: pendingUpdates.map((item) => ({
              organizationId: params.actor.organizationId,
              leadId: item.leadId,
              activityType: CrmActivityType.NOTE_ADDED,
              title: "تکمیل اطلاعات از ورود Excel/CSV",
              actorUserId: params.actor.userId,
              metadata: {
                excelRowNumber: item.row.excelRowNumber,
              },
            })),
          });
          await tx.auditLog.createMany({
            data: pendingUpdates.map((item) => ({
              organizationId: params.actor.organizationId,
              branchId: item.branchId,
              actorUserId: params.actor.userId,
              action: AuditAction.CRM_LEAD_UPDATED,
              entityType: "Lead",
              entityId: item.leadId,
              metadata: {
                source: "CRM_EXCEL_IMPORT",
                excelRowNumber: item.row.excelRowNumber,
                filledFields: Object.keys(item.data),
              },
            })),
          });
        }

        if (pendingCreates.length > 0) {
          await tx.lead.createMany({
            data: pendingCreates.map(({ leadId, row, duplicateOfId }) => {
              const metadata: Record<string, string | number> = {
                importRowNumber: row.excelRowNumber,
              };
              if (row.profile.importedEmail) {
                metadata.importedEmail = row.profile.importedEmail;
              }
              if (row.profile.importedSource) {
                metadata.importedSource = row.profile.importedSource;
              }
              return {
                id: leadId,
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
                isDuplicate: Boolean(duplicateOfId),
                duplicateOfId,
                metadata: metadata as Prisma.InputJsonObject,
              };
            }),
          });
          await tx.crmActivity.createMany({
            data: pendingCreates.map(({ leadId, row }) => ({
              organizationId: params.actor.organizationId,
              leadId,
              activityType: CrmActivityType.LEAD_CREATED,
              title: "لید از Excel/CSV ایجاد شد",
              summary: "CRM_EXCEL_IMPORT",
              actorUserId: params.actor.userId,
              metadata: { excelRowNumber: row.excelRowNumber },
            })),
          });
          await tx.auditLog.createMany({
            data: pendingCreates.map(({ leadId, row }) => ({
              organizationId: params.actor.organizationId,
              branchId: params.branchId,
              actorUserId: params.actor.userId,
              action: AuditAction.CRM_LEAD_CREATED,
              entityType: "Lead",
              entityId: leadId,
              metadata: {
                source: "CRM_EXCEL_IMPORT",
                sourceType: LeadSourceType.IMPORT,
                excelRowNumber: row.excelRowNumber,
              },
            })),
          });
          const assigned = pendingCreates.filter((item) => item.ownerUserId);
          if (assigned.length > 0) {
            const ownerGroups = new Map<string, typeof assigned>();
            for (const item of assigned) {
              const ownerUserId = item.ownerUserId!;
              const group = ownerGroups.get(ownerUserId) ?? [];
              group.push(item);
              ownerGroups.set(ownerUserId, group);
            }
            for (const [ownerUserId, ownerRows] of ownerGroups) {
              const assignmentResult = await setLeadOwnersBulk({
                organizationId: params.actor.organizationId,
                leads: ownerRows.map((item) => ({
                  id: item.leadId,
                  branchId: params.branchId,
                  ownerUserId: null,
                })),
                ownerUserId,
                actorUserId: params.actor.userId,
                source: "IMPORT",
                tx,
              });
              if (!assignmentResult.ok) throw new Error(assignmentResult.error);
            }
          }
          batchCreated += pendingCreates.length;
          rows.push(
            ...pendingCreates.map(({ row }) => ({
              excelRowNumber: row.excelRowNumber,
              status: "ایجاد شد",
              mobile: row.profile.mobile,
              name: displayName(row.profile),
              message: "لید جدید با موفقیت ثبت شد.",
            })),
          );
        }
        return {
          rows,
          created: batchCreated,
          updated: batchUpdated,
          skipped: batchSkipped,
          ownerAssignments: pendingCreates.map((item) => item.ownerUserId),
        };
      }, { maxWait: 10_000, timeout: 60_000 });
      created += batchResults.created;
      updated += batchResults.updated;
      skipped += batchResults.skipped;
      for (const ownerUserId of batchResults.ownerAssignments) {
        ownerCounts.set(ownerUserId, (ownerCounts.get(ownerUserId) ?? 0) + 1);
      }
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
    duplicates,
    invalid: params.invalidRows.length,
    failed,
    ownerDistribution: [...ownerCounts.entries()]
      .map(([ownerUserId, count]) => ({
        ownerUserId,
        ownerName: ownerUserId
          ? ownerNames.get(ownerUserId) ?? "کاربر غیرفعال"
          : "بدون مسئول",
        count,
      }))
      .sort((a, b) => b.count - a.count),
    rows: resultRows,
    csv: buildImportResultCsv(resultRows),
  };
}
