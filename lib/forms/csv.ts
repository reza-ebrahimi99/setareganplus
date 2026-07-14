import {
  FormFieldType,
  type FormFieldType as FormFieldTypeValue,
} from "@/generated/prisma/enums";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import { formatAnswerDisplay } from "@/lib/forms/format-answer-display";

type AnswerLike = {
  valueText: string | null;
  valueLongText: string | null;
  valueNumber: { toString(): string } | null;
  valueDate: Date | null;
  valueJson: unknown;
};

/**
 * CSV cell text for an answer. Multiple choice joined with " | ".
 */
export function formatAnswerForCsv(
  type: FormFieldTypeValue,
  answer: AnswerLike,
  config: unknown,
): string {
  if (type === FormFieldType.MULTIPLE_CHOICE) {
    if (!Array.isArray(answer.valueJson)) {
      return "";
    }
    const parsed = readChoiceConfig(config);
    const labels = answer.valueJson
      .filter((item): item is string => typeof item === "string")
      .map((value) => {
        const match = parsed?.options.find((option) => option.value === value);
        return match?.label ?? value;
      });
    return labels.join(" | ");
  }

  if (type === FormFieldType.CONSENT) {
    return answer.valueJson === true ? "بله" : answer.valueJson === false ? "خیر" : "";
  }

  const display = formatAnswerDisplay(type, answer, config);
  return display === "—" ? "" : display;
}

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvDocument(rows: string[][]): string {
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  // UTF-8 BOM for correct Persian display in Excel
  return `\uFEFF${body}`;
}
