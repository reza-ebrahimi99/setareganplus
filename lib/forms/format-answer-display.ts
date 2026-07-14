import { FormFieldType, type FormFieldType as FormFieldTypeValue } from "@/generated/prisma/enums";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import { toPersianDigits } from "@/lib/persian";

type AnswerLike = {
  valueText: string | null;
  valueLongText: string | null;
  valueNumber: { toString(): string } | null;
  valueDate: Date | null;
  valueJson: unknown;
};

function choiceLabel(config: unknown, value: string): string {
  const parsed = readChoiceConfig(config);
  if (!parsed) {
    return value;
  }
  const match = parsed.options.find((option) => option.value === value);
  return match?.label ?? value;
}

/**
 * Formats a FormAnswer for admin display using the field type and labels.
 */
export function formatAnswerDisplay(
  type: FormFieldTypeValue,
  answer: AnswerLike,
  config: unknown,
): string {
  switch (type) {
    case FormFieldType.LONG_TEXT:
      return answer.valueLongText?.trim() || "—";
    case FormFieldType.NUMBER:
      return answer.valueNumber
        ? toPersianDigits(answer.valueNumber.toString())
        : "—";
    case FormFieldType.DATE:
      return answer.valueDate
        ? toPersianDigits(
            answer.valueDate.toLocaleDateString("fa-IR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          )
        : "—";
    case FormFieldType.MULTIPLE_CHOICE: {
      if (!Array.isArray(answer.valueJson)) {
        return "—";
      }
      const labels = answer.valueJson
        .filter((item): item is string => typeof item === "string")
        .map((value) => choiceLabel(config, value));
      return labels.length > 0 ? labels.join("، ") : "—";
    }
    case FormFieldType.CONSENT:
      return answer.valueJson === true ? "بله" : "خیر";
    case FormFieldType.SINGLE_CHOICE:
    case FormFieldType.DROPDOWN:
    case FormFieldType.GRADE:
    case FormFieldType.ACADEMIC_TRACK: {
      const text = answer.valueText?.trim();
      if (!text) {
        return "—";
      }
      return choiceLabel(config, text);
    }
    case FormFieldType.INFORMATIONAL:
      return "—";
    default:
      return answer.valueText?.trim() || "—";
  }
}
