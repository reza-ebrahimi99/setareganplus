/**
 * Choice Studio validation. Errors block commit/publish; warnings do not.
 */

import {
  CHOICE_STUDIO_MAX_NOTE,
  REQUIRED_COLUMNS,
  SANJESH_ACTIVE_LIMIT,
  type CanonicalChoiceRow,
  type CanonicalColumn,
  type ChoiceImportPreview,
  type ChoiceStudioIssue,
} from "@/lib/guidance/choice-studio/types";
import { normalizeChanceLabel } from "@/lib/guidance/choice-studio/normalize";

export function validateCanonicalRows(
  rows: CanonicalChoiceRow[],
  sheetName: string,
): ChoiceImportPreview {
  const issues: ChoiceStudioIssue[] = [];
  const errorRow = new Set<number>();
  const warningRow = new Set<number>();

  const codes = new Map<string, number[]>();
  const priorities = new Map<number, number[]>();

  for (const row of rows) {
    if (!row.code) {
      push(issues, errorRow, row, "error", "missing_code", "کد رشته الزامی است.");
    }
    if (!row.major) {
      push(issues, errorRow, row, "error", "missing_major", "نام رشته الزامی است.");
    }
    if (!row.university) {
      push(issues, errorRow, row, "error", "missing_university", "نام دانشگاه الزامی است.");
    }
    if (!row.course) {
      push(issues, errorRow, row, "error", "missing_course", "نوع دوره الزامی است.");
    }
    if (row.priority == null) {
      push(issues, errorRow, row, "error", "invalid_priority", "اولویت معتبر نیست.");
    } else {
      const list = priorities.get(row.priority) ?? [];
      list.push(row.sourceRow);
      priorities.set(row.priority, list);
    }
    if (!row.city) {
      push(issues, warningRow, row, "warning", "missing_city", "شهر خالی است.");
    }
    if (row.chanceRaw) {
      const chance = normalizeChanceLabel(row.chanceRaw);
      if (chance.forbidden) {
        push(
          issues,
          warningRow,
          row,
          "warning",
          "forbidden_chance",
          "برآورد شانس نباید قطعی یا تضمینی باشد. این مقدار نادیده گرفته می‌شود.",
        );
      } else if (chance.unknown) {
        push(
          issues,
          warningRow,
          row,
          "warning",
          "unknown_chance",
          "برچسب شانس قبولی شناخته نشد و ذخیره نمی‌شود.",
        );
      }
    }
    if (row.counselorNote.length >= CHOICE_STUDIO_MAX_NOTE) {
      push(issues, warningRow, row, "warning", "long_note", "یادداشت مشاور کوتاه شد.");
    }
    if (row.formulaCell) {
      push(
        issues,
        warningRow,
        row,
        "warning",
        "formula_cell",
        "یکی از خانه‌ها شبیه فرمول اکسل بود و به‌صورت متن خوانده شد.",
      );
    }
    if (row.code) {
      const list = codes.get(row.code) ?? [];
      list.push(row.sourceRow);
      codes.set(row.code, list);
    }
  }

  for (const [code, sourceRows] of codes) {
    if (sourceRows.length > 1) {
      for (const sourceRow of sourceRows) {
        issues.push({
          level: "warning",
          code: "duplicate_code",
          message: `کد رشته «${code}» در چند ردیف تکرار شده است.`,
          rowNumber: sourceRow,
        });
        warningRow.add(sourceRow);
      }
    }
  }

  for (const [priority, sourceRows] of priorities) {
    if (sourceRows.length > 1) {
      for (const sourceRow of sourceRows) {
        issues.push({
          level: "error",
          code: "duplicate_priority",
          message: `اولویت ${priority} تکراری است.`,
          rowNumber: sourceRow,
        });
        errorRow.add(sourceRow);
      }
    }
  }

  const sortedPriorities = [...priorities.keys()].sort((a, b) => a - b);
  if (sortedPriorities.length > 1) {
    const expected = sortedPriorities[sortedPriorities.length - 1]! - sortedPriorities[0]! + 1;
    if (expected !== sortedPriorities.length) {
      issues.push({
        level: "warning",
        code: "priority_gap",
        message: "در اولویت‌ها فاصله وجود دارد. ترتیب منبع حفظ می‌شود و پس از تأیید یکنواخت می‌شود.",
      });
    }
  }

  const exceeds = rows.length > SANJESH_ACTIVE_LIMIT;
  if (exceeds) {
    issues.push({
      level: "warning",
      code: "over_sanjesh_limit",
      message: `${rows.length} انتخاب شناسایی شد. سقف عملیاتی سنجش ${SANJESH_ACTIVE_LIMIT} انتخاب فعال است. قبل از انتشار باید فهرست فعال به این سقف برسد. هیچ ردیفی حذف نشده است.`,
    });
  }

  const hasBlocking = issues.some((i) => i.level === "error") || rows.length === 0;

  return {
    sheetName,
    totalRows: rows.length,
    validRows: rows.length - errorRow.size,
    errorRows: errorRow.size,
    warningRows: warningRow.size,
    activeSanjeshCount: rows.length,
    exceedsSanjeshLimit: exceeds,
    rows,
    issues,
    canCommit: !hasBlocking,
  };
}

export function missingRequiredHeaders(
  mapped: Partial<Record<CanonicalColumn, number>>,
): CanonicalColumn[] {
  return REQUIRED_COLUMNS.filter((col) => mapped[col] == null);
}

function push(
  issues: ChoiceStudioIssue[],
  bucket: Set<number>,
  row: CanonicalChoiceRow,
  level: ChoiceStudioIssue["level"],
  code: string,
  message: string,
) {
  issues.push({ level, code, message, rowNumber: row.sourceRow });
  bucket.add(row.sourceRow);
}
