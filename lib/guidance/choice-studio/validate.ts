/**
 * Choice Studio preview summary. Row content is not validated here — counselor owns data quality.
 * Only the 150-choice operational limit affects direct commit (truncate flow for >150).
 */

import {
  SANJESH_ACTIVE_LIMIT,
  type CanonicalChoiceRow,
  type CanonicalColumn,
  type ChoiceImportPreview,
} from "@/lib/guidance/choice-studio/types";
import { countOverLimit } from "@/lib/guidance/choice-studio/preview-limits";

export function validateCanonicalRows(
  rows: CanonicalChoiceRow[],
  sheetName: string,
): ChoiceImportPreview {
  const exceeds = rows.length > SANJESH_ACTIVE_LIMIT;
  const overLimitCount = countOverLimit(rows.length);
  const total = rows.length;

  return {
    sheetName,
    totalRows: total,
    transferableRows: total,
    validRows: total,
    errorRows: 0,
    warningRows: 0,
    activeSanjeshCount: total,
    exceedsSanjeshLimit: exceeds,
    overLimitCount,
    duplicateCodes: [],
    rows,
    issues: [],
    canCommit: total > 0 && !exceeds,
  };
}

/** File must expose enough mapped columns to parse; no per-field row requirements. */
export function missingRequiredHeaders(
  _mapped: Partial<Record<CanonicalColumn, number>>,
): CanonicalColumn[] {
  return [];
}
