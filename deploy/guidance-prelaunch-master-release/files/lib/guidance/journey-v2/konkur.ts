/**
 * V2 Step 12 — Iranian Konkur result capture.
 * Student values live in step-store; counselor corrections use CounselorCaseCorrection
 * and never silently overwrite the student snapshot.
 *
 * Payload is backward-compatible: legacy single-result JSON remains readable.
 * Multi-group results are stored in `examResults` and mirrored onto the
 * primary group's top-level fields so older readers still work.
 */

import { AuditAction, GuidanceDocumentType } from "@/generated/prisma/enums";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { GUIDANCE_EXAM_GROUPS } from "@/lib/guidance/types";
import { GUIDANCE_EXAM_GROUP_LABELS } from "@/lib/guidance/journey/reference-data/majors";
import {
  isKonkurQuotaId,
  konkurQuotaLabel,
  KONKUR_CATEGORY,
  KONKUR_KIND,
  KONKUR_PARTICIPATION,
  V2_STEP2_CATEGORY,
  V2_STEP2_KIND,
  normalizeGuidanceExamGroup,
  type GuidanceExamGroup,
  type KonkurParticipationId,
} from "@/lib/guidance/journey-v2/constants";
import {
  KONKUR_FIELD_LABELS,
  labelKonkurGroupSection,
} from "@/lib/guidance/journey-v2/labels";
import {
  KONKUR_GROUP_RESULT_FIELDS,
  konkurResultFieldName,
  parseKonkurFieldKey,
  parseSelectedExamGroups,
  prefillForExamGroup,
  type KonkurExamGroupResult,
  type KonkurFieldView,
  type KonkurGroupView,
  type KonkurResultData,
  type SelectedExamGroups,
} from "@/lib/guidance/journey-v2/konkur-shared";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import { uploadGuidanceTypedDocument, loadLatestGuidanceDocument } from "@/lib/guidance/journey-v2/documents";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export {
  KONKUR_GROUP_RESULT_FIELDS,
  konkurResultFieldName,
  parseKonkurFieldKey,
  parseSelectedExamGroups,
  prefillForExamGroup,
};
export type {
  KonkurExamGroupResult,
  KonkurFieldView,
  KonkurGroupResultField,
  KonkurGroupView,
  KonkurResultData,
  SelectedExamGroups,
} from "@/lib/guidance/journey-v2/konkur-shared";

function isExamGroup(value: string): value is GuidanceExamGroup {
  return (GUIDANCE_EXAM_GROUPS as readonly string[]).includes(value);
}

export async function loadSelectedExamGroups(params: {
  organizationId: string;
  planPublicId: string;
  planExamGroup: GuidanceExamGroup;
}): Promise<SelectedExamGroups> {
  const stored = await loadGuidanceStepData<Record<string, unknown>>({
    organizationId: params.organizationId,
    category: V2_STEP2_CATEGORY,
    kind: V2_STEP2_KIND,
    planPublicId: params.planPublicId,
    validate: (data) => (data && typeof data === "object" ? (data as Record<string, unknown>) : null),
  });
  return parseSelectedExamGroups(stored.data, params.planExamGroup);
}

function parseRank(raw: string): number | null {
  const digits = toLatinDigits(raw.trim()).replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
  return value;
}

function parseScore(raw: string): number | null {
  if (!raw.trim()) return null;
  const normalized = toLatinDigits(raw.trim()).replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100_000) return null;
  return Math.round(value * 100) / 100;
}

function isParticipation(value: string): value is KonkurParticipationId {
  return KONKUR_PARTICIPATION.some((p) => p.id === value);
}

function readInputField(
  input: Record<string, string>,
  examGroup: GuidanceExamGroup,
  field: string,
  singleGroup: boolean,
): string {
  const namespaced = input[konkurResultFieldName(examGroup, field)];
  if (namespaced != null && namespaced !== "") return namespaced;
  if (singleGroup && input[field] != null) return input[field];
  return namespaced ?? "";
}

function parseOptionalNumber(
  raw: string,
  parser: (value: string) => number | null,
): { value: number | null; invalid: boolean } {
  if (!raw.trim()) return { value: null, invalid: false };
  const value = parser(raw);
  return { value, invalid: value === null };
}

function validateGroupResult(
  input: Record<string, string>,
  examGroup: GuidanceExamGroup,
  singleGroup: boolean,
  fieldErrors: Record<string, string>,
): KonkurExamGroupResult | null {
  const err = (field: string, message: string) => {
    fieldErrors[konkurResultFieldName(examGroup, field)] = message;
  };

  const participationStatus = readInputField(input, examGroup, "participationStatus", singleGroup).trim();
  if (!isParticipation(participationStatus)) {
    err("participationStatus", "وضعیت شرکت در آزمون را مشخص کنید.");
  }

  let quota: string | null = readInputField(input, examGroup, "quota", singleGroup).trim() || null;
  if (quota && !isKonkurQuotaId(quota)) {
    err("quota", "سهمیه نامعتبر است.");
    quota = null;
  }

  const quotaRankRaw = readInputField(input, examGroup, "quotaRank", singleGroup);
  const quotaRank = parseOptionalNumber(quotaRankRaw, parseRank);
  if (quotaRank.invalid) err("quotaRank", "رتبه در سهمیه معتبر نیست.");

  const nationalRankRaw = readInputField(input, examGroup, "nationalRank", singleGroup);
  const nationalRank = parseOptionalNumber(nationalRankRaw, parseRank);
  if (nationalRank.invalid) err("nationalRank", "رتبه کشوری معتبر نیست.");

  const totalScoreRaw = readInputField(input, examGroup, "totalScore", singleGroup);
  const totalScore = parseOptionalNumber(totalScoreRaw, parseScore);
  if (totalScore.invalid) err("totalScore", "نمره کل معتبر نیست.");

  const academicRecordScoreRaw = readInputField(input, examGroup, "academicRecordScore", singleGroup);
  const academicRecordScore = parseOptionalNumber(academicRecordScoreRaw, parseScore);
  if (academicRecordScore.invalid) err("academicRecordScore", "نمره سابقه تحصیلی معتبر نیست.");

  const specificTestScoreRaw = readInputField(input, examGroup, "specificTestScore", singleGroup);
  const specificTestScore = parseOptionalNumber(specificTestScoreRaw, parseScore);
  if (specificTestScore.invalid) err("specificTestScore", "نمره آزمون اختصاصی معتبر نیست.");

  const finalScoreRaw = readInputField(input, examGroup, "finalScore", singleGroup);
  const finalScore = parseOptionalNumber(finalScoreRaw, parseScore);
  if (finalScore.invalid) err("finalScore", "نمره کل نهایی معتبر نیست.");

  const region = readInputField(input, examGroup, "region", singleGroup).trim() || null;
  if (region && region.length > 80) err("region", "منطقه خیلی طولانی است.");
  const note = readInputField(input, examGroup, "note", singleGroup).trim() || null;
  if (note && note.length > 800) err("note", "توضیح خیلی طولانی است.");

  if (participationStatus === "participated") {
    if (quotaRank.value === null && nationalRank.value === null) {
      err("nationalRank", "حداقل یکی از رتبه در سهمیه یا رتبه کشوری را وارد کنید.");
    }
    if (totalScore.value === null && finalScore.value === null) {
      err("finalScore", "حداقل یکی از نمره کل یا نمره نهایی را وارد کنید.");
    }
  }

  if (!isParticipation(participationStatus)) return null;

  return {
    examGroup,
    participationStatus,
    quota,
    quotaRank: quotaRank.value,
    nationalRank: nationalRank.value,
    totalScore: totalScore.value,
    academicRecordScore: academicRecordScore.value,
    specificTestScore: specificTestScore.value,
    finalScore: finalScore.value,
    region,
    note,
  };
}

function mirrorPrimary(
  examYear: string,
  examResults: KonkurExamGroupResult[],
  primary: GuidanceExamGroup,
): Omit<KonkurResultData, "savedAtIso"> {
  const head = examResults.find((row) => row.examGroup === primary) ?? examResults[0];
  return {
    examGroup: head.examGroup,
    examYear,
    participationStatus: head.participationStatus,
    quota: head.quota,
    quotaRank: head.quotaRank,
    nationalRank: head.nationalRank,
    totalScore: head.totalScore,
    academicRecordScore: head.academicRecordScore,
    specificTestScore: head.specificTestScore,
    finalScore: head.finalScore,
    region: head.region,
    note: head.note,
    examResults,
  };
}

export function validateKonkurInput(
  input: Record<string, string>,
  selected: SelectedExamGroups,
): {
  ok: true;
  data: Omit<KonkurResultData, "savedAtIso">;
} | {
  ok: false;
  error: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  const examYear = toLatinDigits(input.examYear?.trim() ?? "").replace(/[^\d]/g, "");
  if (!/^\d{4}$/.test(examYear) || Number(examYear) < 1390 || Number(examYear) > 1410) {
    fieldErrors.examYear = "سال آزمون را به‌صورت شمسی چهار رقمی وارد کنید.";
  }

  const singleGroup = selected.secondary.length === 0;
  const examResults: KonkurExamGroupResult[] = [];
  for (const examGroup of selected.ordered) {
    const row = validateGroupResult(input, examGroup, singleGroup, fieldErrors);
    if (row) examResults.push(row);
  }

  if (Object.keys(fieldErrors).length > 0 || examResults.length !== selected.ordered.length) {
    return { ok: false, error: "لطفاً موارد مشخص‌شده را اصلاح کنید.", fieldErrors };
  }

  return {
    ok: true,
    data: mirrorPrimary(examYear, examResults, selected.primary),
  };
}

function parseStoredGroup(raw: unknown): KonkurExamGroupResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.examGroup !== "string" || !isExamGroup(obj.examGroup)) return null;
  if (!isParticipation(String(obj.participationStatus ?? ""))) return null;
  return {
    examGroup: obj.examGroup,
    participationStatus: obj.participationStatus as KonkurParticipationId,
    quota: typeof obj.quota === "string" ? obj.quota : null,
    quotaRank: typeof obj.quotaRank === "number" ? obj.quotaRank : null,
    nationalRank: typeof obj.nationalRank === "number" ? obj.nationalRank : null,
    totalScore: typeof obj.totalScore === "number" ? obj.totalScore : null,
    academicRecordScore: typeof obj.academicRecordScore === "number" ? obj.academicRecordScore : null,
    specificTestScore: typeof obj.specificTestScore === "number" ? obj.specificTestScore : null,
    finalScore: typeof obj.finalScore === "number" ? obj.finalScore : null,
    region: typeof obj.region === "string" ? obj.region : null,
    note: typeof obj.note === "string" ? obj.note : null,
  };
}

function validateStored(raw: unknown): KonkurResultData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.examYear !== "string") return null;

  const listed = Array.isArray(obj.examResults)
    ? obj.examResults.map(parseStoredGroup).filter((row): row is KonkurExamGroupResult => Boolean(row))
    : [];

  if (listed.length > 0) {
    const primary = listed[0];
    return {
      examGroup: typeof obj.examGroup === "string" ? obj.examGroup : primary.examGroup,
      examYear: obj.examYear,
      participationStatus: isParticipation(String(obj.participationStatus ?? ""))
        ? (obj.participationStatus as KonkurParticipationId)
        : primary.participationStatus,
      quota: typeof obj.quota === "string" ? obj.quota : primary.quota,
      quotaRank: typeof obj.quotaRank === "number" ? obj.quotaRank : primary.quotaRank,
      nationalRank: typeof obj.nationalRank === "number" ? obj.nationalRank : primary.nationalRank,
      totalScore: typeof obj.totalScore === "number" ? obj.totalScore : primary.totalScore,
      academicRecordScore:
        typeof obj.academicRecordScore === "number" ? obj.academicRecordScore : primary.academicRecordScore,
      specificTestScore:
        typeof obj.specificTestScore === "number" ? obj.specificTestScore : primary.specificTestScore,
      finalScore: typeof obj.finalScore === "number" ? obj.finalScore : primary.finalScore,
      region: typeof obj.region === "string" ? obj.region : primary.region,
      note: typeof obj.note === "string" ? obj.note : primary.note,
      savedAtIso: typeof obj.savedAtIso === "string" ? obj.savedAtIso : "",
      examResults: listed,
    };
  }

  if (typeof obj.examGroup !== "string") return null;
  if (!isParticipation(String(obj.participationStatus ?? ""))) return null;
  const legacyGroup = isExamGroup(obj.examGroup)
    ? obj.examGroup
    : normalizeGuidanceExamGroup(obj.examGroup);
  const legacy: KonkurExamGroupResult = {
    examGroup: legacyGroup,
    participationStatus: obj.participationStatus as KonkurParticipationId,
    quota: typeof obj.quota === "string" ? obj.quota : null,
    quotaRank: typeof obj.quotaRank === "number" ? obj.quotaRank : null,
    nationalRank: typeof obj.nationalRank === "number" ? obj.nationalRank : null,
    totalScore: typeof obj.totalScore === "number" ? obj.totalScore : null,
    academicRecordScore: typeof obj.academicRecordScore === "number" ? obj.academicRecordScore : null,
    specificTestScore: typeof obj.specificTestScore === "number" ? obj.specificTestScore : null,
    finalScore: typeof obj.finalScore === "number" ? obj.finalScore : null,
    region: typeof obj.region === "string" ? obj.region : null,
    note: typeof obj.note === "string" ? obj.note : null,
  };
  return {
    examGroup: obj.examGroup,
    examYear: obj.examYear,
    participationStatus: legacy.participationStatus,
    quota: legacy.quota,
    quotaRank: legacy.quotaRank,
    nationalRank: legacy.nationalRank,
    totalScore: legacy.totalScore,
    academicRecordScore: legacy.academicRecordScore,
    specificTestScore: legacy.specificTestScore,
    finalScore: legacy.finalScore,
    region: legacy.region,
    note: legacy.note,
    savedAtIso: typeof obj.savedAtIso === "string" ? obj.savedAtIso : "",
    examResults: [legacy],
  };
}

export async function loadKonkurResult(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<KonkurResultData | null> {
  const stored = await loadGuidanceStepData<KonkurResultData>({
    organizationId: params.organizationId,
    category: KONKUR_CATEGORY,
    kind: KONKUR_KIND,
    planPublicId: params.planPublicId,
    validate: validateStored,
  });
  return stored.data;
}

export function displayKonkurValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  const field = key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : key;
  if (field === "examGroup") {
    return GUIDANCE_EXAM_GROUP_LABELS[value as keyof typeof GUIDANCE_EXAM_GROUP_LABELS] ?? String(value);
  }
  if (field === "quota") return konkurQuotaLabel(String(value));
  if (field === "participationStatus") {
    return KONKUR_PARTICIPATION.find((p) => p.id === value)?.label ?? String(value);
  }
  return String(value);
}

function valueForKey(data: KonkurResultData | null, fieldKey: string, primary: string): unknown {
  if (!data) return null;
  const parsed = parseKonkurFieldKey(fieldKey, primary);
  if (!parsed) return null;
  if (parsed.field === "examYear") return data.examYear;
  if (parsed.field === "examGroup") return parsed.examGroup;
  const row = prefillForExamGroup(data, parsed.examGroup);
  if (!row) return null;
  return row[parsed.field as keyof KonkurExamGroupResult];
}

export async function saveKonkurResult(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  data: Omit<KonkurResultData, "savedAtIso">;
  file: File | null;
}): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const existingDoc = await loadLatestGuidanceDocument({
    organizationId: params.organizationId,
    planId: params.planId,
    documentType: GuidanceDocumentType.EXAM_RESULT,
  });

  const anyParticipated = params.data.examResults.some(
    (row) => row.participationStatus === "participated",
  );
  if (!existingDoc && !params.file && anyParticipated) {
    return {
      ok: false,
      error: "بارگذاری تصویر یا PDF کارنامه رسمی سنجش الزامی است.",
      fieldErrors: { file: "کارنامه سنجش را بارگذاری کنید." },
    };
  }

  if (params.file) {
    const uploaded = await uploadGuidanceTypedDocument({
      organizationId: params.organizationId,
      planId: params.planId,
      planPublicId: params.planPublicId,
      userId: params.actorUserId,
      file: params.file,
      documentType: GuidanceDocumentType.EXAM_RESULT,
    });
    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error, fieldErrors: { file: uploaded.error } };
    }
  }

  const payload: KonkurResultData = {
    ...params.data,
    savedAtIso: new Date().toISOString(),
  };

  await saveGuidanceStepData({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: KONKUR_CATEGORY,
    kind: KONKUR_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: payload,
    filenamePrefix: "guidance-v2-konkur",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.planPublicId,
        step: 12,
        examYear: payload.examYear,
        participationStatus: payload.participationStatus,
        examGroups: payload.examResults.map((row) => row.examGroup),
      },
    },
  });

  return { ok: true };
}

function buildGroupFields(params: {
  examGroup: GuidanceExamGroup;
  role: "primary" | "floating";
  studentData: KonkurResultData | null;
  latestByField: Map<string, {
    fieldKey: string;
    newValue: string;
    previousValue: string;
    reason: string | null;
    counselor: { firstName: string; lastName: string };
    createdAt: Date;
  }>;
}): KonkurGroupView {
  const title = labelKonkurGroupSection(params.examGroup, params.role);
  const groupLabel = GUIDANCE_EXAM_GROUP_LABELS[params.examGroup];
  const keys: Array<{ key: string; field: string; label: string }> = KONKUR_GROUP_RESULT_FIELDS.map(
    (field) => ({
      key: `${params.examGroup}.${field}`,
      field,
      label: `${KONKUR_FIELD_LABELS[field] ?? field} — ${groupLabel}`,
    }),
  );

  const fields: KonkurFieldView[] = keys.map((item) => {
    const studentRaw = valueForKey(params.studentData, item.key, params.examGroup);
    const corr =
      params.latestByField.get(item.key) ??
      params.latestByField.get(konkurResultFieldName(params.examGroup, item.field)) ??
      (params.role === "primary" ? params.latestByField.get(item.field) : undefined);
    const studentValue = displayKonkurValue(item.field, studentRaw);
    const currentValue = corr ? corr.newValue : studentValue;
    return {
      key: item.key,
      label: item.label,
      studentValue,
      currentValue,
      corrected: Boolean(corr),
      examGroup: params.examGroup,
      correction: corr
        ? {
            previousValue: corr.previousValue,
            newValue: corr.newValue,
            reason: corr.reason,
            actorName: `${corr.counselor.firstName} ${corr.counselor.lastName}`.trim(),
            createdLabel: formatJalaliDateTimeShort(corr.createdAt),
          }
        : undefined,
    };
  });

  return { examGroup: params.examGroup, role: params.role, title, fields };
}

export async function loadKonkurCaseView(params: {
  organizationId: string;
  studentId: string;
  planPublicId: string;
  planId: string;
  planExamGroup: GuidanceExamGroup;
}) {
  const [studentData, corrections, document, selected] = await Promise.all([
    loadKonkurResult({
      organizationId: params.organizationId,
      planPublicId: params.planPublicId,
    }),
    prisma.counselorCaseCorrection.findMany({
      where: {
        organizationId: params.organizationId,
        studentId: params.studentId,
        section: "konkur",
      },
      include: { counselor: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    loadLatestGuidanceDocument({
      organizationId: params.organizationId,
      planId: params.planId,
      documentType: GuidanceDocumentType.EXAM_RESULT,
    }),
    loadSelectedExamGroups({
      organizationId: params.organizationId,
      planPublicId: params.planPublicId,
      planExamGroup: params.planExamGroup,
    }),
  ]);

  const latestByField = new Map<string, (typeof corrections)[number]>();
  for (const row of corrections) {
    if (!latestByField.has(row.fieldKey)) latestByField.set(row.fieldKey, row);
  }

  const groups = selected.ordered.map((examGroup, index) =>
    buildGroupFields({
      examGroup,
      role: index === 0 ? "primary" : "floating",
      studentData,
      latestByField,
    }),
  );

  const examYearCorr = latestByField.get("examYear");
  const examYearField: KonkurFieldView = {
    key: "examYear",
    label: KONKUR_FIELD_LABELS.examYear,
    studentValue: displayKonkurValue("examYear", studentData?.examYear),
    currentValue: examYearCorr ? examYearCorr.newValue : displayKonkurValue("examYear", studentData?.examYear),
    corrected: Boolean(examYearCorr),
    examGroup: selected.primary,
    correction: examYearCorr
      ? {
          previousValue: examYearCorr.previousValue,
          newValue: examYearCorr.newValue,
          reason: examYearCorr.reason,
          actorName: `${examYearCorr.counselor.firstName} ${examYearCorr.counselor.lastName}`.trim(),
          createdLabel: formatJalaliDateTimeShort(examYearCorr.createdAt),
        }
      : undefined,
  };

  const fields = [examYearField, ...groups.flatMap((group) => group.fields)];

  return {
    studentData,
    selected,
    groups,
    fields,
    document: document
      ? {
          id: document.id,
          filename: document.originalFilename,
          uploadedLabel: formatJalaliDateTimeShort(document.createdAt),
          verificationStatus: document.verificationStatus,
          reviewNote: document.reviewNote ?? null,
        }
      : null,
  };
}

export async function correctKonkurField(params: {
  organizationId: string;
  counselorUserId: string;
  studentId: string;
  planPublicId: string;
  planExamGroup: GuidanceExamGroup;
  fieldKey: string;
  nextValue: string;
  reason?: string;
}) {
  const selected = await loadSelectedExamGroups({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
    planExamGroup: params.planExamGroup,
  });
  const parsed = parseKonkurFieldKey(params.fieldKey, selected.primary);
  if (!parsed || (!KONKUR_FIELD_LABELS[parsed.field] && parsed.field !== "examYear")) {
    throw new Error("این فیلد قابل اصلاح نیست.");
  }
  if (!selected.ordered.includes(parsed.examGroup) && parsed.field !== "examYear") {
    throw new Error("این گروه آزمایشی در انتخاب مرحله ۲ دانش‌آموز نیست.");
  }

  const stored = await loadKonkurResult({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
  });
  const previous = displayKonkurValue(
    parsed.field,
    valueForKey(stored, `${parsed.examGroup}.${parsed.field}`, selected.primary),
  );
  const next = params.nextValue.trim();
  if (!next || next.length > 200) {
    throw new Error("مقدار جدید نامعتبر است.");
  }

  const groupLabel = GUIDANCE_EXAM_GROUP_LABELS[parsed.examGroup];
  const fieldLabel =
    parsed.field === "examYear"
      ? KONKUR_FIELD_LABELS.examYear
      : `${KONKUR_FIELD_LABELS[parsed.field] ?? parsed.field} — ${groupLabel}`;

  await prisma.counselorCaseCorrection.create({
    data: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      counselorUserId: params.counselorUserId,
      section: "konkur",
      fieldKey: parsed.field === "examYear" ? "examYear" : `${parsed.examGroup}.${parsed.field}`,
      fieldLabel,
      previousValue: previous,
      newValue: next,
      reason: params.reason?.trim() || null,
    },
  });
}
