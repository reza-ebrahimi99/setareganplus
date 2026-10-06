/**
 * Read-only full Excel backup of every lead and the rows that hang off it.
 *
 * Includes soft-deleted leads. Names are resolved for people, branches, and
 * stages; ids stay in extra columns so the file can be reconciled.
 * Secret tokens (booking cancel/check-in hashes, commerce QR tokens) are omitted.
 *
 *   npx tsx scripts/leads-full-export.ts
 *   npx tsx scripts/leads-full-export.ts --out /var/backups/setareganplus/leads-full.xlsx
 *
 * DATABASE_URL must already be in the environment. The file is written outside
 * /var/www with mode 600.
 */

import ExcelJS from "exceljs";
import { Prisma } from "../generated/prisma/client";
import {
  CommerceOrderPaymentStatus,
  PaymentStatus,
  RegistrationPaymentStatus,
} from "../generated/prisma/enums";
import { SCORE_BAND_LABELS } from "../lib/crm/scoring";
import { PRODUCT_TYPE_LABELS } from "../lib/registration/flows/constants";
import { prisma } from "../lib/prisma";
import {
  EXPORT_KIND,
  MANIFEST_SHEET,
  type SheetCount,
  assertKnownArgs,
  assertOutsideWebRoot,
  clip,
  defaultExportPath,
  iso,
  jsonCell,
  likelyTestReason,
  parseArgs,
  personName,
  writeSecureFile,
} from "./leads-backup-shared";

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته‌شده",
  NO_ANSWER: "بدون پاسخ",
  CONSULTATION_SCHEDULED: "جلسه هماهنگ‌شده",
  WAITING_FOR_DECISION: "منتظر تصمیم",
  WAITING_FOR_PAYMENT: "منتظر پرداخت",
  ENROLLED: "ثبت‌نام‌شده",
  LOST: "از دست‌رفته",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  FORM: "فرم",
  BOOKING: "رزرو نوبت",
  MANUAL: "ثبت دستی",
  IMPORT: "ورود فایل",
  REGISTRATION: "ثبت‌نام",
  OTHER: "سایر",
};

const SOURCE_LABELS: Record<string, string> = {
  WEB_PRE_REGISTRATION: "پیش‌ثبت‌نام وب",
  PRE_REGISTRATION: "پیش‌ثبت‌نام",
  FORM_SUBMISSION: "فرم",
  MANUAL: "ثبت دستی",
  BOOKING: "رزرو نوبت",
  IMPORT: "ورود فایل",
  REGISTRATION: "ثبت‌نام",
  SHOP: "فروشگاه",
  AUTOMATION: "اتوماسیون",
  AI_ASSISTANT: "دستیار هوشمند",
};

const ACTIVITY_LABELS: Record<string, string> = {
  NOTE: "یادداشت",
  CALL: "تماس",
  STATUS_CHANGE: "تغییر وضعیت",
  ASSIGNMENT: "تخصیص",
  SYSTEM: "سیستمی",
};

const CONSENT_LABELS: Record<string, string> = {
  PRE_REGISTRATION: "پیش‌ثبت‌نام",
  DATA_PROCESSING: "پردازش داده",
  MARKETING_CONTACT: "تماس بازاریابی",
};

type Cell = string | number | null;

function labelOf<K extends string>(
  map: Readonly<Record<K, string>>,
  value: string | null | undefined,
): string {
  if (!value) return "";
  if (Object.prototype.hasOwnProperty.call(map, value)) {
    return map[value as K];
  }
  return value;
}

function idsOrNone(ids: readonly string[]): Prisma.StringFilter | null {
  if (ids.length === 0) return null;
  return { in: [...ids] };
}

function addSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  sheetKey: string,
  headers: string[],
  rows: Cell[][],
  countStarValue: number | null,
): SheetCount {
  if (countStarValue != null && rows.length !== countStarValue) {
    throw new Error(
      `شمار برگه ${sheetKey} (${rows.length}) با count(*) (${countStarValue}) یکی نیست. فایل نوشته نشد.`,
    );
  }
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  const header = sheet.addRow(headers);
  header.font = { bold: true };
  if (rows.length > 0) sheet.addRows(rows);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  return {
    sheetKey,
    sheetName,
    rows: rows.length,
    countStar: countStarValue,
    match: countStarValue == null ? "derived" : "yes",
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  assertKnownArgs(parsed, ["out"]);
  const outputPath = assertOutsideWebRoot(parsed.values.get("out") ?? defaultExportPath());
  const exportedAt = new Date();

  const counts: SheetCount[] = [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = EXPORT_KIND;
  workbook.created = exportedAt;

  const bundle = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const leadCount = await countStarIn(tx, Prisma.raw(`"leads"`));
      const loadedRaw = await tx.lead.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const organizationById = await rowsById(
        (ids) =>
          tx.organization.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, slug: true },
          }),
        loadedRaw.map((lead) => lead.organizationId),
      );
      const branchById = await rowsById(
        (ids) =>
          tx.branch.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          }),
        loadedRaw.map((lead) => lead.branchId),
      );
      const stageById = await rowsById(
        (ids) =>
          tx.crmPipelineStage.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          }),
        loadedRaw.map((lead) => lead.stageId),
      );
      const pipelineById = await rowsById(
        (ids) =>
          tx.crmPipeline.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          }),
        loadedRaw.map((lead) => lead.pipelineId),
      );
      const ownerById = await rowsById(
        (ids) =>
          tx.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, firstName: true, lastName: true },
          }),
        loadedRaw.map((lead) => lead.ownerUserId),
      );
      const loaded = loadedRaw.map((lead) => ({
        ...lead,
        organization: mustGet(organizationById, lead.organizationId, "organization"),
        branch: mustGet(branchById, lead.branchId, "branch"),
        stage: lead.stageId ? (stageById.get(lead.stageId) ?? null) : null,
        pipeline: lead.pipelineId ? (pipelineById.get(lead.pipelineId) ?? null) : null,
        owner: lead.ownerUserId ? (ownerById.get(lead.ownerUserId) ?? null) : null,
      }));
      if (loaded.length !== leadCount) {
        throw new Error(
          `شمار متقاضیان (${loaded.length}) با count(*) (${leadCount}) یکی نیست.`,
        );
      }
      const related = await collectRelated(tx, loaded);
      const leadCountAfter = await countStarIn(tx, Prisma.raw(`"leads"`));
      if (leadCountAfter !== leadCount) {
        throw new Error("شمار متقاضیان در همین خواندن عوض شد. دوباره اجرا کنید.");
      }
      return { loaded, leadCount, related };
    },
    { timeout: 180_000, maxWait: 15_000 },
  );

  const leads = bundle.loaded;
  const snapshot = bundle.related;

  const nameById = new Map(
    leads.map((lead) => [lead.id, personName(lead.firstName, lead.lastName)]),
  );

  counts.push(
    addSheet(
      workbook,
      "متقاضیان",
      "leads",
      [
        "سازمان",
        "نام",
        "نام خانوادگی",
        "نام پدر",
        "موبایل",
        "موبایل خام",
        "موبایل نرمال",
        "شعبه",
        "وضعیت",
        "مرحله",
        "پایپ‌لاین",
        "مسئول",
        "امتیاز",
        "باند امتیاز",
        "منبع",
        "نوع منبع",
        "مدرسه",
        "پایه",
        "رشته",
        "شهر",
        "استان",
        "کد ملی",
        "جنسیت",
        "تاریخ تولد",
        "علاقه خدمت",
        "توضیح",
        "پیگیری بعدی",
        "آخرین تماس",
        "زمان تبدیل",
        "زمان از دست رفتن",
        "علت از دست رفتن",
        "تکراری",
        "تکراری از",
        "ایجاد",
        "به‌روزرسانی",
        "حذف نرم",
        "شناسه",
        "شناسه شعبه",
        "شناسه مسئول",
        "شناسه مرحله",
        "ریز امتیاز",
      ],
      leads.map((lead) => [
        lead.organization.name,
        lead.firstName,
        lead.lastName,
        lead.fatherName ?? "",
        lead.mobile,
        lead.mobileRaw,
        lead.normalizedMobile ?? "",
        lead.branch.name,
        labelOf(LEAD_STATUS_LABELS, lead.status),
        lead.stage?.name ?? "",
        lead.pipeline?.name ?? "",
        personName(lead.owner?.firstName, lead.owner?.lastName),
        lead.score,
        labelOf(SCORE_BAND_LABELS, lead.scoreBand),
        labelOf(SOURCE_LABELS, lead.source),
        labelOf(SOURCE_TYPE_LABELS, lead.sourceType),
        lead.school ?? "",
        lead.gradeLevel ?? "",
        lead.studyField ?? "",
        lead.city ?? "",
        lead.province ?? "",
        lead.nationalCode ?? "",
        lead.gender ?? "",
        iso(lead.birthDate),
        lead.serviceInterest,
        clip(lead.description ?? ""),
        iso(lead.nextFollowUpAt),
        iso(lead.lastContactAt),
        iso(lead.convertedAt),
        iso(lead.lostAt),
        lead.lostReason ?? "",
        lead.isDuplicate ? "بله" : "خیر",
        lead.duplicateOfId ? (nameById.get(lead.duplicateOfId) ?? "") : "",
        iso(lead.createdAt),
        iso(lead.updatedAt),
        iso(lead.deletedAt),
        lead.id,
        lead.branchId,
        lead.ownerUserId ?? "",
        lead.stageId ?? "",
        jsonCell(lead.scoreBreakdown),
      ]),
      bundle.leadCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "تاریخچه مالکیت",
      "ownership",
      ["متقاضی", "مسئول", "از", "تا", "منبع", "ثبت‌کننده", "شناسه متقاضی", "شناسه"],
      snapshot.ownership.map((row) => [
        personName(row.lead.firstName, row.lead.lastName),
        personName(row.owner?.firstName, row.owner?.lastName),
        iso(row.effectiveFrom),
        iso(row.effectiveTo),
        row.source,
        personName(row.actor?.firstName, row.actor?.lastName),
        row.leadId,
        row.id,
      ]),
      snapshot.ownershipCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "فعالیت لید",
      "lead_activities",
      ["متقاضی", "شعبه", "نوع", "متن", "وضعیت قبلی", "وضعیت جدید", "زمان", "شناسه متقاضی", "شناسه"],
      snapshot.leadActivities.map((row) => [
        personName(row.lead.firstName, row.lead.lastName),
        row.branch.name,
        labelOf(ACTIVITY_LABELS, row.type),
        clip(row.content),
        labelOf(LEAD_STATUS_LABELS, row.previousStatus),
        labelOf(LEAD_STATUS_LABELS, row.newStatus),
        iso(row.createdAt),
        row.leadId,
        row.id,
      ]),
      snapshot.leadActivityCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "فعالیت CRM",
      "crm_activities",
      ["متقاضی", "نوع", "عنوان", "خلاصه", "انجام‌دهنده", "زمان وقوع", "شناسه متقاضی", "شناسه"],
      snapshot.crmActivities.map((row) => [
        personName(row.lead.firstName, row.lead.lastName),
        row.activityType,
        row.title,
        clip(row.summary ?? ""),
        personName(row.actor?.firstName, row.actor?.lastName),
        iso(row.occurredAt),
        row.leadId,
        row.id,
      ]),
      snapshot.crmActivityCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "وظایف",
      "crm_tasks",
      [
        "متقاضی",
        "عنوان",
        "شرح",
        "نوع",
        "اولویت",
        "وضعیت",
        "سررسید",
        "مسئول",
        "ایجادکننده",
        "انجام",
        "لغو",
        "حذف نرم",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.tasks.map((row) => [
        personName(row.lead.firstName, row.lead.lastName),
        row.title,
        clip(row.description ?? ""),
        row.taskType,
        row.priority,
        row.status,
        iso(row.dueAt),
        personName(row.assignedTo?.firstName, row.assignedTo?.lastName),
        personName(row.createdBy?.firstName, row.createdBy?.lastName),
        iso(row.completedAt),
        iso(row.cancelledAt),
        iso(row.deletedAt),
        row.leadId,
        row.id,
      ]),
      snapshot.taskCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "تماس‌ها",
      "crm_call_logs",
      [
        "متقاضی",
        "کارشناس",
        "نتیجه",
        "یادداشت",
        "مدت ثانیه",
        "زمان تماس",
        "پیگیری بعدی",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.calls.map((row) => [
        personName(row.lead.firstName, row.lead.lastName),
        personName(row.membership.user.firstName, row.membership.user.lastName),
        row.outcome,
        clip(row.note ?? ""),
        row.durationSeconds,
        iso(row.calledAt),
        iso(row.nextFollowUpAt),
        row.leadId,
        row.id,
      ]),
      snapshot.callCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "رضایت‌ها",
      "consents",
      ["متقاضی", "شعبه", "نوع", "نسخه", "متن", "زمان", "شناسه متقاضی", "شناسه"],
      snapshot.consents.map((row) => [
        personName(row.lead.firstName, row.lead.lastName),
        row.branch.name,
        labelOf(CONSENT_LABELS, row.consentType),
        row.consentVersion,
        clip(row.consentText),
        iso(row.grantedAt),
        row.leadId,
        row.id,
      ]),
      snapshot.consentCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "ارسال فرم",
      "form_submissions",
      [
        "متقاضی",
        "فرم",
        "نسخه",
        "وضعیت",
        "کد پیگیری",
        "موبایل",
        "ایمیل",
        "زمان ارسال",
        "حذف نرم",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.submissions.map((row) => [
        row.lead ? personName(row.lead.firstName, row.lead.lastName) : "",
        row.formVersion.title || row.form.slug,
        row.formVersion.versionNumber,
        row.status,
        row.trackingCode ?? "",
        row.mobile ?? "",
        row.email ?? "",
        iso(row.submittedAt),
        iso(row.deletedAt),
        row.leadId ?? row.matchedCrmLeadId ?? "",
        row.id,
      ]),
      snapshot.submissionCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "پاسخ فرم",
      "form_answers",
      [
        "فرم",
        "کد پیگیری",
        "برچسب فیلد",
        "کلید فیلد",
        "متن",
        "متن بلند",
        "عدد",
        "تاریخ",
        "داده ساخت‌یافته",
        "شناسه ارسال",
        "شناسه",
      ],
      snapshot.answers.map((row) => [
        row.submission.formVersion.title,
        row.submission.trackingCode ?? "",
        row.field.label,
        row.fieldKey,
        clip(row.valueText ?? ""),
        clip(row.valueLongText ?? ""),
        row.valueNumber == null ? "" : row.valueNumber.toString(),
        iso(row.valueDate),
        jsonCell(row.valueJson),
        row.submissionId,
        row.id,
      ]),
      snapshot.answerCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "رزروها",
      "bookings",
      [
        "متقاضی پرونده",
        "نام",
        "نام خانوادگی",
        "موبایل",
        "خدمت",
        "مشاور",
        "شروع",
        "وضعیت",
        "نوع جلسه",
        "کد پیگیری",
        "یادداشت",
        "ورود",
        "حذف نرم",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.bookings.map((row) => [
        row.lead ? personName(row.lead.firstName, row.lead.lastName) : "",
        row.firstName,
        row.lastName,
        row.normalizedMobile,
        row.slot.service.title,
        row.slot.advisor.displayName,
        iso(row.slot.startsAt),
        row.status,
        row.meetingType,
        row.trackingCode,
        clip(row.notes ?? ""),
        iso(row.checkedInAt),
        iso(row.deletedAt),
        row.leadId ?? "",
        row.id,
      ]),
      snapshot.bookingCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "ثبت‌نام‌ها",
      "registrations",
      [
        "متقاضی",
        "شماره ثبت‌نام",
        "دانش‌آموز",
        "ولی",
        "نسبت",
        "موبایل ولی",
        "شعبه",
        "نوع",
        "عنوان محصول",
        "وضعیت",
        "وضعیت پرداخت",
        "مبلغ نهایی ریال",
        "تعداد پرداخت",
        "جمع پرداخت‌شده ریال",
        "ایجاد",
        "حذف نرم",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.registrations.map((row) => {
        const paid = row.paymentIntents.filter((intent) => intent.status === PaymentStatus.PAID);
        return [
          row.lead ? personName(row.lead.firstName, row.lead.lastName) : "",
          row.registrationNumber,
          personName(row.studentFirstName, row.studentLastName),
          row.parentName ?? "",
          row.parentRelationship ?? "",
          row.parentMobile ?? "",
          row.branch.name,
          labelOf(PRODUCT_TYPE_LABELS, row.productType),
          row.productTitle ?? "",
          row.status,
          row.paymentStatus,
          row.finalAmountRials,
          row.paymentIntents.length,
          paid.reduce((sum, intent) => sum + intent.finalAmountRials, 0),
          iso(row.createdAt),
          iso(row.deletedAt),
          row.leadId ?? "",
          row.id,
        ];
      }),
      snapshot.registrationCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "پرداخت‌ها",
      "payments",
      [
        "شماره ثبت‌نام",
        "متقاضی",
        "نوع",
        "وضعیت",
        "مبلغ ریال",
        "مبلغ نهایی ریال",
        "رسید",
        "کد پیگیری",
        "پرداخت در",
        "ایجاد",
        "شناسه ثبت‌نام",
        "شناسه",
      ],
      snapshot.payments.map((row) => [
        row.registration?.registrationNumber ?? "",
        row.registration?.lead
          ? personName(row.registration.lead.firstName, row.registration.lead.lastName)
          : "",
        row.payableType,
        row.status,
        row.amountRials,
        row.finalAmountRials,
        row.receiptNumber ?? "",
        row.trackingCode ?? "",
        iso(row.paidAt),
        iso(row.createdAt),
        row.registrationId ?? "",
        row.id,
      ]),
      snapshot.paymentCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "سفارش‌ها",
      "commerce_orders",
      [
        "متقاضی",
        "شماره سفارش",
        "خریدار",
        "موبایل",
        "وضعیت",
        "وضعیت پرداخت",
        "مبلغ ریال",
        "اقلام",
        "کد پیگیری",
        "شعبه",
        "ایجاد",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.orders.map((row) => [
        row.lead ? personName(row.lead.firstName, row.lead.lastName) : "",
        row.orderNumber,
        row.buyerName || personName(row.buyerFirstName, row.buyerLastName),
        row.buyerMobile ?? "",
        row.status,
        row.paymentStatus,
        row.grandTotalRials,
        row.items.map((item) => `${item.titleSnapshot} × ${item.quantity}`).join(" | "),
        row.shortCode,
        row.branch?.name ?? "",
        iso(row.createdAt),
        row.leadId ?? "",
        row.id,
      ]),
      snapshot.orderCount,
    ),
  );

  counts.push(
    addSheet(
      workbook,
      "انتساب درآمد",
      "attribution",
      [
        "متقاضی",
        "شماره ثبت‌نام",
        "مبلغ ریال",
        "منتسب به",
        "وضعیت",
        "سیاست",
        "زمان انتساب",
        "کلید درآمد",
        "شناسه متقاضی",
        "شناسه",
      ],
      snapshot.attribution.map((row) => [
        row.lead ? personName(row.lead.firstName, row.lead.lastName) : "",
        row.registration?.registrationNumber ?? "",
        row.amountRials,
        personName(row.attributedUser?.firstName, row.attributedUser?.lastName),
        row.status,
        row.policy.name,
        iso(row.attributedAt),
        row.revenueKey,
        row.leadId ?? "",
        row.id,
      ]),
      snapshot.attributionCount,
    ),
  );

  const paidRegistrationLeadIds = new Set<string>();
  const paidRegistrationNumbers = new Map<string, string[]>();
  for (const registration of snapshot.registrations) {
    if (!registration.leadId) continue;
    const paidIntent = registration.paymentIntents.some(
      (intent) => intent.status === PaymentStatus.PAID,
    );
    if (registration.paymentStatus === RegistrationPaymentStatus.PAID || paidIntent) {
      paidRegistrationLeadIds.add(registration.leadId);
      const list = paidRegistrationNumbers.get(registration.leadId) ?? [];
      list.push(registration.registrationNumber);
      paidRegistrationNumbers.set(registration.leadId, list);
    }
  }
  const paidOrderLeadIds = new Set<string>();
  const paidOrderNumbers = new Map<string, string[]>();
  for (const order of snapshot.orders) {
    if (!order.leadId) continue;
    if (
      order.paymentStatus === CommerceOrderPaymentStatus.PAID ||
      order.paymentStatus === CommerceOrderPaymentStatus.PARTIAL ||
      order.paymentStatus === CommerceOrderPaymentStatus.REFUNDED
    ) {
      paidOrderLeadIds.add(order.leadId);
      const list = paidOrderNumbers.get(order.leadId) ?? [];
      list.push(order.orderNumber);
      paidOrderNumbers.set(order.leadId, list);
    }
  }

  const reviewRows: Cell[][] = [];
  for (const lead of leads) {
    const testReason = likelyTestReason(lead.firstName, lead.lastName);
    const hasPaidRegistration = paidRegistrationLeadIds.has(lead.id);
    const hasPaidOrder = paidOrderLeadIds.has(lead.id);
    if (!testReason && !hasPaidRegistration && !hasPaidOrder) continue;
    reviewRows.push([
      personName(lead.firstName, lead.lastName),
      lead.mobile,
      lead.branch.name,
      iso(lead.createdAt),
      iso(lead.deletedAt),
      testReason ? "بله" : "خیر",
      testReason ?? "",
      hasPaidRegistration ? "بله" : "خیر",
      (paidRegistrationNumbers.get(lead.id) ?? []).join("، "),
      hasPaidOrder ? "بله" : "خیر",
      (paidOrderNumbers.get(lead.id) ?? []).join("، "),
      lead.id,
    ]);
  }
  counts.push(
    addSheet(
      workbook,
      "بازبینی",
      "review",
      [
        "متقاضی",
        "موبایل",
        "شعبه",
        "ایجاد",
        "حذف نرم",
        "احتمال آزمایشی",
        "دلیل آزمایشی",
        "ثبت‌نام پرداخت‌شده",
        "شماره ثبت‌نام",
        "سفارش پرداخت‌شده",
        "شماره سفارش",
        "شناسه",
      ],
      reviewRows,
      null,
    ),
  );

  const manifest = workbook.addWorksheet(MANIFEST_SHEET, {
    views: [{ rightToLeft: true }],
  });
  const meta: Array<[string, string]> = [
    ["kind", EXPORT_KIND],
    ["exportedAt", exportedAt.toISOString()],
    ["includesSoftDeleted", "true"],
    ["hardDelete", "false"],
    [
      "note",
      "شمار برگه‌های داده با count(*) همان خواندن فقط-خواندنی چک شده است. برگه بازبینی مشتق است و حذف را محدود نمی‌کند.",
    ],
    [
      "omitted",
      "هش توکن لغو و ورود رزرو، و توکن QR سفارش، عمداً در فایل نیست.",
    ],
  ];
  for (const [key, value] of meta) manifest.addRow([key, value]);
  manifest.addRow([]);
  manifest.addRow(["sheetKey", "sheetName", "rows", "countStar", "match"]);
  for (const count of counts) {
    manifest.addRow([
      count.sheetKey,
      count.sheetName,
      count.rows,
      count.countStar ?? "",
      count.match,
    ]);
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const written = writeSecureFile(outputPath, buffer);
  console.log(`فایل پشتیبان نوشته شد.`);
  console.log(`BACKUP_PATH=${written}`);
  console.log(`BACKUP_EXPORTED_AT=${exportedAt.toISOString()}`);
  for (const count of counts) {
    const star = count.countStar == null ? "derived" : String(count.countStar);
    console.log(`${count.sheetKey}=${count.rows} count_star=${star} match=${count.match}`);
  }
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function rowsById<T extends { id: string }>(
  load: (ids: string[]) => Promise<T[]>,
  ids: Array<string | null | undefined>,
): Promise<Map<string, T>> {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return new Map();
  const rows = await load(unique);
  return new Map(rows.map((row) => [row.id, row]));
}

function mustGet<T>(map: Map<string, T>, id: string, label: string): T {
  const row = map.get(id);
  if (!row) throw new Error(`ردیف وابسته پیدا نشد (${label}). فایل نوشته نشد.`);
  return row;
}

async function countStarIn(tx: Prisma.TransactionClient, table: Prisma.Sql): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ count: number | string }>>(
    Prisma.sql`SELECT count(*)::int AS count FROM ${table}`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function loadCounted<T>(
  countRows: () => Promise<number>,
  loadRows: () => Promise<T[]>,
): Promise<[number, T[]]> {
  const count = await countRows();
  const rows = await loadRows();
  return [count, rows];
}

async function collectRelated(
  tx: Prisma.TransactionClient,
  leads: Array<{
    id: string;
    firstName: string;
    lastName: string;
    sourceFormSubmissionId: string | null;
    sourceBookingReservationId: string | null;
  }>,
) {
  const leadIds = leads.map((lead) => lead.id);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const leadNames = (leadId: string | null | undefined) => {
    if (!leadId) return null;
    const lead = leadById.get(leadId);
    return lead ? { firstName: lead.firstName, lastName: lead.lastName } : null;
  };
  const usersById = (ids: Array<string | null | undefined>) =>
    rowsById(
      (unique) =>
        tx.user.findMany({
          where: { id: { in: unique } },
          select: { id: true, firstName: true, lastName: true },
        }),
      ids,
    );
  const branchesById = (ids: Array<string | null | undefined>) =>
    rowsById(
      (unique) =>
        tx.branch.findMany({
          where: { id: { in: unique } },
          select: { id: true, name: true },
        }),
      ids,
    );
  const leadFilter = idsOrNone(leadIds);
  const sourceSubmissionIds = [
    ...new Set(
      leads
        .map((lead) => lead.sourceFormSubmissionId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const sourceBookingIds = [
    ...new Set(
      leads
        .map((lead) => lead.sourceBookingReservationId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const empty = {
    ownership: [],
    ownershipCount: 0,
    leadActivities: [],
    leadActivityCount: 0,
    crmActivities: [],
    crmActivityCount: 0,
    tasks: [],
    taskCount: 0,
    calls: [],
    callCount: 0,
    consents: [],
    consentCount: 0,
    submissions: [],
    submissionCount: 0,
    answers: [],
    answerCount: 0,
    bookings: [],
    bookingCount: 0,
    registrations: [],
    registrationCount: 0,
    payments: [],
    paymentCount: 0,
    orders: [],
    orderCount: 0,
    attribution: [],
    attributionCount: 0,
  };
  if (!leadFilter && sourceSubmissionIds.length === 0 && sourceBookingIds.length === 0) {
    return empty;
  }

  const ownershipWhere = leadFilter ? { leadId: leadFilter } : { id: { in: [] as string[] } };
  const [ownershipCount, ownershipRows] = leadFilter
    ? await loadCounted(
        () => tx.leadOwnershipHistory.count({ where: ownershipWhere }),
        () =>
          tx.leadOwnershipHistory.findMany({
            where: ownershipWhere,
            orderBy: [{ effectiveFrom: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const ownershipUsers = await usersById(
    ownershipRows.flatMap((row) => [row.ownerUserId, row.actorUserId]),
  );
  const ownership = ownershipRows.map((row) => ({
    ...row,
    lead: leadNames(row.leadId) ?? { firstName: "", lastName: "" },
    owner: row.ownerUserId ? (ownershipUsers.get(row.ownerUserId) ?? null) : null,
    actor: row.actorUserId ? (ownershipUsers.get(row.actorUserId) ?? null) : null,
  }));

  const [leadActivityCount, leadActivityRows] = leadFilter
    ? await loadCounted(
        () => tx.leadActivity.count({ where: { leadId: leadFilter } }),
        () =>
          tx.leadActivity.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const leadActivityBranches = await branchesById(leadActivityRows.map((row) => row.branchId));
  const leadActivities = leadActivityRows.map((row) => ({
    ...row,
    lead: leadNames(row.leadId) ?? { firstName: "", lastName: "" },
    branch: mustGet(leadActivityBranches, row.branchId, "branch"),
  }));

  const [crmActivityCount, crmActivityRows] = leadFilter
    ? await loadCounted(
        () => tx.crmActivity.count({ where: { leadId: leadFilter } }),
        () =>
          tx.crmActivity.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const crmActivityUsers = await usersById(crmActivityRows.map((row) => row.actorUserId));
  const crmActivities = crmActivityRows.map((row) => ({
    ...row,
    lead: leadNames(row.leadId) ?? { firstName: "", lastName: "" },
    actor: row.actorUserId ? (crmActivityUsers.get(row.actorUserId) ?? null) : null,
  }));

  const [taskCount, taskRows] = leadFilter
    ? await loadCounted(
        () => tx.crmTask.count({ where: { leadId: leadFilter } }),
        () =>
          tx.crmTask.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const taskUsers = await usersById(
    taskRows.flatMap((row) => [row.assignedToUserId, row.createdByUserId]),
  );
  const tasks = taskRows.map((row) => ({
    ...row,
    lead: leadNames(row.leadId) ?? { firstName: "", lastName: "" },
    assignedTo: row.assignedToUserId ? (taskUsers.get(row.assignedToUserId) ?? null) : null,
    createdBy: row.createdByUserId ? (taskUsers.get(row.createdByUserId) ?? null) : null,
  }));

  const [callCount, callRows] = leadFilter
    ? await loadCounted(
        () => tx.crmCallLog.count({ where: { leadId: leadFilter } }),
        () =>
          tx.crmCallLog.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ calledAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const callMemberships = await rowsById(
    (ids) =>
      tx.organizationMembership.findMany({
        where: { id: { in: ids } },
        select: { id: true, userId: true },
      }),
    callRows.map((row) => row.membershipId),
  );
  const callUsers = await usersById(
    callRows.map((row) => callMemberships.get(row.membershipId)?.userId),
  );
  const calls = callRows.map((row) => ({
    ...row,
    lead: leadNames(row.leadId) ?? { firstName: "", lastName: "" },
    membership: {
      user: mustGet(
        callUsers,
        mustGet(callMemberships, row.membershipId, "membership").userId,
        "user",
      ),
    },
  }));

  const [consentCount, consentRows] = leadFilter
    ? await loadCounted(
        () => tx.consentRecord.count({ where: { leadId: leadFilter } }),
        () =>
          tx.consentRecord.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ grantedAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const consentBranches = await branchesById(consentRows.map((row) => row.branchId));
  const consents = consentRows.map((row) => ({
    ...row,
    lead: leadNames(row.leadId) ?? { firstName: "", lastName: "" },
    branch: mustGet(consentBranches, row.branchId, "branch"),
  }));

  const submissionOr: Prisma.FormSubmissionWhereInput[] = [];
  if (leadFilter) {
    submissionOr.push({ leadId: leadFilter }, { matchedCrmLeadId: leadFilter });
  }
  if (sourceSubmissionIds.length > 0) submissionOr.push({ id: { in: sourceSubmissionIds } });
  const submissionWhere: Prisma.FormSubmissionWhereInput =
    submissionOr.length > 0 ? { OR: submissionOr } : { id: { in: [] } };
  const [submissionCount, submissions] =
    submissionOr.length > 0
      ? await loadCounted(
          () => tx.formSubmission.count({ where: submissionWhere }),
          () =>
            tx.formSubmission.findMany({
              where: submissionWhere,
              orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
            }),
        )
      : [0, []];
  const submissionForms = await rowsById(
    (ids) =>
      tx.form.findMany({
        where: { id: { in: ids } },
        select: { id: true, slug: true },
      }),
    submissions.map((row) => row.formId),
  );
  const submissionVersions = await rowsById(
    (ids) =>
      tx.formVersion.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, versionNumber: true },
      }),
    submissions.map((row) => row.formVersionId),
  );
  const hydratedSubmissions = submissions.map((row) => ({
    ...row,
    lead: leadNames(row.leadId ?? row.matchedCrmLeadId),
    form: mustGet(submissionForms, row.formId, "form"),
    formVersion: mustGet(submissionVersions, row.formVersionId, "formVersion"),
  }));

  const submissionIds = hydratedSubmissions.map((row) => row.id);
  const [answerCount, answers] =
    submissionIds.length > 0
      ? await loadCounted(
          () => tx.formAnswer.count({ where: { submissionId: { in: submissionIds } } }),
          () =>
            tx.formAnswer.findMany({
              where: { submissionId: { in: submissionIds } },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            }),
        )
      : [0, []];
  const answerFields = await rowsById(
    (ids) =>
      tx.formField.findMany({
        where: { id: { in: ids } },
        select: { id: true, label: true },
      }),
    answers.map((row) => row.fieldId),
  );
  const submissionById = new Map(hydratedSubmissions.map((row) => [row.id, row]));
  const hydratedAnswers = answers.map((row) => {
    const submission = mustGet(submissionById, row.submissionId, "submission");
    return {
      ...row,
      field: mustGet(answerFields, row.fieldId, "field"),
      submission: {
        trackingCode: submission.trackingCode,
        formVersion: { title: submission.formVersion.title },
      },
    };
  });

  const bookingOr: Prisma.BookingReservationWhereInput[] = [];
  if (leadFilter) bookingOr.push({ leadId: leadFilter });
  if (sourceBookingIds.length > 0) bookingOr.push({ id: { in: sourceBookingIds } });
  const bookingWhere: Prisma.BookingReservationWhereInput =
    bookingOr.length > 0 ? { OR: bookingOr } : { id: { in: [] } };
  const [bookingCount, bookings] =
    bookingOr.length > 0
      ? await loadCounted(
          () => tx.bookingReservation.count({ where: bookingWhere }),
          () =>
            tx.bookingReservation.findMany({
              where: bookingWhere,
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            }),
        )
      : [0, []];
  const bookingSlots = await rowsById(
    (ids) =>
      tx.bookingSlot.findMany({
        where: { id: { in: ids } },
        select: { id: true, startsAt: true, serviceId: true, advisorId: true },
      }),
    bookings.map((row) => row.slotId),
  );
  const bookingServices = await rowsById(
    (ids) =>
      tx.bookingService.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true },
      }),
    [...bookingSlots.values()].map((row) => row.serviceId),
  );
  const bookingAdvisors = await rowsById(
    (ids) =>
      tx.bookingAdvisor.findMany({
        where: { id: { in: ids } },
        select: { id: true, displayName: true },
      }),
    [...bookingSlots.values()].map((row) => row.advisorId),
  );
  const hydratedBookings = bookings.map((row) => {
    const slot = mustGet(bookingSlots, row.slotId, "slot");
    return {
      ...row,
      lead: leadNames(row.leadId),
      slot: {
        startsAt: slot.startsAt,
        service: mustGet(bookingServices, slot.serviceId, "service"),
        advisor: mustGet(bookingAdvisors, slot.advisorId, "advisor"),
      },
    };
  });

  const [registrationCount, registrations] = leadFilter
    ? await loadCounted(
        () => tx.registration.count({ where: { leadId: leadFilter } }),
        () =>
          tx.registration.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const registrationBranches = await branchesById(registrations.map((row) => row.branchId));

  const [orderCount, orders] = leadFilter
    ? await loadCounted(
        () => tx.commerceOrder.count({ where: { leadId: leadFilter } }),
        () =>
          tx.commerceOrder.findMany({
            where: { leadId: leadFilter },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
      )
    : [0, []];
  const orderBranches = await branchesById(orders.map((row) => row.branchId));
  const orderItems = orders.length
    ? await tx.commerceOrderItem.findMany({
        where: { orderId: { in: orders.map((row) => row.id) } },
        select: { orderId: true, titleSnapshot: true, quantity: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    : [];
  const itemsByOrder = new Map<string, Array<{ titleSnapshot: string; quantity: number }>>();
  for (const item of orderItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({ titleSnapshot: item.titleSnapshot, quantity: item.quantity });
    itemsByOrder.set(item.orderId, list);
  }

  const registrationIds = registrations.map((row) => row.id);
  const orderIds = orders.map((row) => row.id);
  const paymentOr: Prisma.PaymentIntentWhereInput[] = [];
  if (registrationIds.length > 0) paymentOr.push({ registrationId: { in: registrationIds } });
  if (orderIds.length > 0) {
    paymentOr.push({
      payableType: "COMMERCE_ORDER",
      payableId: { in: orderIds },
    });
  }
  const paymentWhere: Prisma.PaymentIntentWhereInput =
    paymentOr.length > 0 ? { OR: paymentOr } : { id: { in: [] } };
  const [paymentCount, payments] =
    paymentOr.length > 0
      ? await loadCounted(
          () => tx.paymentIntent.count({ where: paymentWhere }),
          () =>
            tx.paymentIntent.findMany({
              where: paymentWhere,
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            }),
        )
      : [0, []];
  const registrationById = new Map(registrations.map((row) => [row.id, row]));
  const hydratedPayments = payments.map((row) => {
    const registration = row.registrationId
      ? (registrationById.get(row.registrationId) ?? null)
      : null;
    return {
      ...row,
      registration: registration
        ? {
            registrationNumber: registration.registrationNumber,
            lead: leadNames(registration.leadId),
          }
        : null,
    };
  });
  const intentsByRegistration = new Map<
    string,
    Array<{ status: PaymentStatus; finalAmountRials: number }>
  >();
  for (const payment of payments) {
    if (!payment.registrationId) continue;
    const list = intentsByRegistration.get(payment.registrationId) ?? [];
    list.push({ status: payment.status, finalAmountRials: payment.finalAmountRials });
    intentsByRegistration.set(payment.registrationId, list);
  }
  const hydratedRegistrations = registrations.map((row) => ({
    ...row,
    lead: leadNames(row.leadId),
    branch: mustGet(registrationBranches, row.branchId, "branch"),
    paymentIntents: intentsByRegistration.get(row.id) ?? [],
  }));
  const hydratedOrders = orders.map((row) => ({
    ...row,
    lead: leadNames(row.leadId),
    branch: row.branchId ? (orderBranches.get(row.branchId) ?? null) : null,
    items: itemsByOrder.get(row.id) ?? [],
  }));

  const paymentIds = payments.map((row) => row.id);
  const attributionOr: Prisma.AttributionSnapshotWhereInput[] = [];
  if (leadFilter) attributionOr.push({ leadId: leadFilter });
  if (registrationIds.length > 0) attributionOr.push({ registrationId: { in: registrationIds } });
  if (paymentIds.length > 0) attributionOr.push({ paymentIntentId: { in: paymentIds } });
  const attributionWhere: Prisma.AttributionSnapshotWhereInput =
    attributionOr.length > 0 ? { OR: attributionOr } : { id: { in: [] } };
  const [attributionCount, attribution] =
    attributionOr.length > 0
      ? await loadCounted(
          () => tx.attributionSnapshot.count({ where: attributionWhere }),
          () =>
            tx.attributionSnapshot.findMany({
              where: attributionWhere,
              orderBy: [{ attributedAt: "asc" }, { id: "asc" }],
            }),
        )
      : [0, []];
  const attributionUsers = await usersById(attribution.map((row) => row.attributedUserId));
  const attributionPolicies = await rowsById(
    (ids) =>
      tx.attributionPolicy.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }),
    attribution.map((row) => row.policyId),
  );
  const hydratedAttribution = attribution.map((row) => ({
    ...row,
    lead: leadNames(row.leadId),
    registration: row.registrationId
      ? {
          registrationNumber:
            registrationById.get(row.registrationId)?.registrationNumber ?? "",
        }
      : null,
    attributedUser: row.attributedUserId
      ? (attributionUsers.get(row.attributedUserId) ?? null)
      : null,
    policy: mustGet(attributionPolicies, row.policyId, "policy"),
  }));

  assertLength("ownership", ownership.length, ownershipCount);
  assertLength("lead_activities", leadActivities.length, leadActivityCount);
  assertLength("crm_activities", crmActivities.length, crmActivityCount);
  assertLength("crm_tasks", tasks.length, taskCount);
  assertLength("crm_call_logs", calls.length, callCount);
  assertLength("consents", consents.length, consentCount);
  assertLength("form_submissions", submissions.length, submissionCount);
  assertLength("form_answers", answers.length, answerCount);
  assertLength("bookings", bookings.length, bookingCount);
  assertLength("registrations", registrations.length, registrationCount);
  assertLength("payments", payments.length, paymentCount);
  assertLength("commerce_orders", orders.length, orderCount);
  assertLength("attribution", attribution.length, attributionCount);

  return {
    ownership,
    ownershipCount,
    leadActivities,
    leadActivityCount,
    crmActivities,
    crmActivityCount,
    tasks,
    taskCount,
    calls,
    callCount,
    consents,
    consentCount,
    submissions: hydratedSubmissions,
    submissionCount,
    answers: hydratedAnswers,
    answerCount,
    bookings: hydratedBookings,
    bookingCount,
    registrations: hydratedRegistrations,
    registrationCount,
    payments: hydratedPayments,
    paymentCount,
    orders: hydratedOrders,
    orderCount,
    attribution: hydratedAttribution,
    attributionCount,
  };
}

function assertLength(key: string, rows: number, countStarValue: number): void {
  if (rows !== countStarValue) {
    throw new Error(
      `شمار ${key} (${rows}) با count(*) (${countStarValue}) یکی نیست. فایل نوشته نشد.`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
