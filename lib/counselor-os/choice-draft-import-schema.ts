/**
 * Strict JSON body validation for choice draft import (no external schema deps).
 */

import { takeFirstRowsForDraft } from "@/lib/guidance/choice-studio/preview-limits";
import {
  SANJESH_ACTIVE_LIMIT,
  type CanonicalChoiceRow,
} from "@/lib/guidance/choice-studio/types";

export type ChoiceDraftImportMode = "full" | "truncate_first_150";

export type ChoiceDraftImportKind = "INITIAL" | "FINAL";

export type ChoiceDraftImportBody = {
  requestId: string;
  kind: ChoiceDraftImportKind;
  mode: ChoiceDraftImportMode;
  truncateAck: boolean;
  replaceReady: boolean;
  rows: CanonicalChoiceRow[];
};

export type ChoiceDraftImportValidation =
  | { ok: true; body: ChoiceDraftImportBody; importRows: CanonicalChoiceRow[] }
  | { ok: false; error: string; status: number };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseRow(raw: unknown, index: number): CanonicalChoiceRow | null {
  if (!isRecord(raw)) return null;
  const sourceRow = typeof raw.sourceRow === "number" ? raw.sourceRow : index + 1;
  const priority =
    raw.priority === null || typeof raw.priority === "number" ? raw.priority : null;
  return {
    sourceRow,
    priority,
    priorityRaw: str(raw.priorityRaw),
    code: str(raw.code),
    major: str(raw.major),
    university: str(raw.university),
    city: str(raw.city),
    course: str(raw.course),
    courseCode:
      raw.courseCode === null || typeof raw.courseCode === "string" ? raw.courseCode : null,
    description: str(raw.description),
    chance: raw.chance === null || typeof raw.chance === "string" ? raw.chance : null,
    chanceRaw: str(raw.chanceRaw),
    counselorNote: str(raw.counselorNote),
    formulaCell: raw.formulaCell === true,
  };
}

export function validateChoiceDraftImportPayload(raw: unknown): ChoiceDraftImportValidation {
  if (!isRecord(raw)) {
    return { ok: false, error: "بدنه درخواست نامعتبر است.", status: 400 };
  }

  const requestId = str(raw.requestId);
  if (requestId.length < 8 || requestId.length > 64) {
    return { ok: false, error: "شناسه درخواست (requestId) نامعتبر است.", status: 400 };
  }

  const kindRaw = str(raw.kind);
  const kind: ChoiceDraftImportKind =
    kindRaw === "FINAL" ? "FINAL" : kindRaw === "INITIAL" ? "INITIAL" : "INITIAL";
  if (kindRaw !== "INITIAL" && kindRaw !== "FINAL") {
    return { ok: false, error: "نوع فهرست (kind) باید INITIAL یا FINAL باشد.", status: 400 };
  }

  const modeRaw = str(raw.mode);
  const mode: ChoiceDraftImportMode =
    modeRaw === "truncate_first_150" ? "truncate_first_150" : modeRaw === "full" ? "full" : "full";
  if (modeRaw !== "full" && modeRaw !== "truncate_first_150") {
    return { ok: false, error: "mode نامعتبر است.", status: 400 };
  }

  const truncateAck = raw.truncateAck === true;
  const replaceReady = raw.replaceReady === true;

  if (!Array.isArray(raw.rows)) {
    return { ok: false, error: "ردیف‌های پیش‌نمایش یافت نشد.", status: 400 };
  }

  const rows: CanonicalChoiceRow[] = [];
  for (let i = 0; i < raw.rows.length; i += 1) {
    const parsed = parseRow(raw.rows[i], i);
    if (!parsed) {
      return { ok: false, error: `ردیف ${i + 1} نامعتبر است.`, status: 400 };
    }
    rows.push(parsed);
  }

  if (rows.length === 0) {
    return { ok: false, error: "ردیفی برای ورود وجود ندارد.", status: 400 };
  }

  if (mode === "full") {
    if (rows.length > SANJESH_ACTIVE_LIMIT) {
      const extra = rows.length - SANJESH_ACTIVE_LIMIT;
      return {
        ok: false,
        error: `تعداد انتخاب‌ها ${rows.length} مورد است؛ حداکثر ${SANJESH_ACTIVE_LIMIT} انتخاب مجاز است. ابتدا ${extra} مورد را حذف کنید.`,
        status: 400,
      };
    }
    return {
      ok: true,
      body: { requestId, kind, mode, truncateAck, replaceReady, rows },
      importRows: rows,
    };
  }

  if (rows.length <= SANJESH_ACTIVE_LIMIT) {
    return {
      ok: true,
      body: { requestId, kind, mode, truncateAck, replaceReady, rows },
      importRows: rows,
    };
  }

  if (!truncateAck) {
    return {
      ok: false,
      error: "برای انتقال ۱۵۰ انتخاب اول، تأیید صریح لازم است.",
      status: 400,
    };
  }

  const importRows = takeFirstRowsForDraft(rows);
  return {
    ok: true,
    body: { requestId, kind, mode, truncateAck, replaceReady, rows },
    importRows,
  };
}
