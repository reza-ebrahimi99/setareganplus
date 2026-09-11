/**
 * Client-safe Step 12 Konkur types and field helpers.
 * Keep Prisma / step-store out of this module so student forms can import it.
 */

import { GUIDANCE_EXAM_GROUPS } from "@/lib/guidance/types";
import {
  normalizeGuidanceExamGroup,
  type GuidanceExamGroup,
  type KonkurParticipationId,
} from "@/lib/guidance/journey-v2/constants";
import { KONKUR_FIELD_LABELS } from "@/lib/guidance/journey-v2/labels";

export const KONKUR_GROUP_RESULT_FIELDS = [
  "participationStatus",
  "quota",
  "quotaRank",
  "nationalRank",
  "totalScore",
  "academicRecordScore",
  "specificTestScore",
  "finalScore",
  "region",
  "note",
] as const;

export type KonkurGroupResultField = (typeof KONKUR_GROUP_RESULT_FIELDS)[number];

export type KonkurExamGroupResult = {
  examGroup: GuidanceExamGroup;
  participationStatus: KonkurParticipationId;
  quota: string | null;
  quotaRank: number | null;
  nationalRank: number | null;
  totalScore: number | null;
  academicRecordScore: number | null;
  specificTestScore: number | null;
  finalScore: number | null;
  region: string | null;
  note: string | null;
};

export type KonkurResultData = {
  examGroup: string;
  examYear: string;
  participationStatus: KonkurParticipationId;
  quota: string | null;
  quotaRank: number | null;
  nationalRank: number | null;
  totalScore: number | null;
  academicRecordScore: number | null;
  specificTestScore: number | null;
  finalScore: number | null;
  region: string | null;
  note: string | null;
  savedAtIso: string;
  examResults: KonkurExamGroupResult[];
};

export type SelectedExamGroups = {
  primary: GuidanceExamGroup;
  secondary: GuidanceExamGroup[];
  ordered: GuidanceExamGroup[];
};

export type KonkurFieldView = {
  key: string;
  label: string;
  studentValue: string;
  currentValue: string;
  corrected: boolean;
  examGroup: GuidanceExamGroup;
  correction?: {
    previousValue: string;
    newValue: string;
    reason: string | null;
    actorName: string;
    createdLabel: string;
  };
};

export type KonkurGroupView = {
  examGroup: GuidanceExamGroup;
  role: "primary" | "floating";
  title: string;
  fields: KonkurFieldView[];
};

export function konkurResultFieldName(examGroup: string, field: string): string {
  return `r.${examGroup}.${field}`;
}

export function parseKonkurFieldKey(
  key: string,
  primary: string,
): { examGroup: GuidanceExamGroup; field: string } | null {
  if (key === "examYear" || key === "savedAtIso") {
    return { examGroup: normalizeGuidanceExamGroup(primary), field: key };
  }
  if (KONKUR_FIELD_LABELS[key] && !key.includes(".")) {
    return { examGroup: normalizeGuidanceExamGroup(primary), field: key };
  }
  const stripped = key.startsWith("r.") ? key.slice(2) : key;
  const dot = stripped.indexOf(".");
  if (dot <= 0) return null;
  const examGroupRaw = stripped.slice(0, dot);
  const field = stripped.slice(dot + 1);
  if (!(GUIDANCE_EXAM_GROUPS as readonly string[]).includes(examGroupRaw)) return null;
  if (!KONKUR_FIELD_LABELS[field] && field !== "examYear") return null;
  return { examGroup: examGroupRaw as GuidanceExamGroup, field };
}

export function prefillForExamGroup(
  data: KonkurResultData | null,
  examGroup: GuidanceExamGroup,
): KonkurExamGroupResult | null {
  if (!data) return null;
  const fromList = data.examResults.find((row) => row.examGroup === examGroup);
  if (fromList) return fromList;
  if (data.examGroup === examGroup) {
    return {
      examGroup,
      participationStatus: data.participationStatus,
      quota: data.quota,
      quotaRank: data.quotaRank,
      nationalRank: data.nationalRank,
      totalScore: data.totalScore,
      academicRecordScore: data.academicRecordScore,
      specificTestScore: data.specificTestScore,
      finalScore: data.finalScore,
      region: data.region,
      note: data.note,
    };
  }
  return null;
}

function isExamGroup(value: string): value is GuidanceExamGroup {
  return (GUIDANCE_EXAM_GROUPS as readonly string[]).includes(value);
}

export function parseSelectedExamGroups(
  raw: unknown,
  fallback: GuidanceExamGroup,
): SelectedExamGroups {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const primaryRaw = typeof obj?.primary === "string" && isExamGroup(obj.primary)
    ? obj.primary
    : fallback;
  const primary = normalizeGuidanceExamGroup(primaryRaw);
  const secondary: GuidanceExamGroup[] = [];
  const list = Array.isArray(obj?.secondary) ? obj.secondary : [];
  for (const item of list) {
    if (typeof item !== "string" || !isExamGroup(item)) continue;
    if (item === primary || secondary.includes(item)) continue;
    secondary.push(item);
  }
  return { primary, secondary, ordered: [primary, ...secondary] };
}
