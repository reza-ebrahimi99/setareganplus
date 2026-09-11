import type { CounselorLateJourneyModel } from "@/lib/counselor-os/late-journey";
import type { ChoiceItemView, ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { labelChoiceBand, labelChoiceFeedback } from "@/lib/guidance/journey-v2/labels";

export function choicePrintRows(list: ChoiceListView | null): ChoiceItemView[] {
  return (list?.items ?? []).filter((i) => i.isActive);
}

export function printChoiceCells(item: ChoiceItemView) {
  return {
    order: item.sortOrder,
    code: item.officialCode || "",
    university: item.university,
    major: item.major,
    city: item.city || item.province || "",
    educationType: item.educationTypeLabel,
    band: labelChoiceBand(item.band),
    note: item.notes,
    feedback: item.feedback?.verdict
      ? `${labelChoiceFeedback(item.feedback.verdict)}${item.feedback.note ? ` — ${item.feedback.note}` : ""}`
      : "",
  };
}

export function lateSummaryLines(model: CounselorLateJourneyModel) {
  return [
    { label: "جلسه اول", value: model.firstSession.whenLabel ?? model.firstSession.statusLabel },
    { label: "جلسه دوم", value: model.secondSession.whenLabel ?? model.secondSession.statusLabel },
    { label: "چیدمان اولیه", value: model.arrangementLabel },
    { label: "بررسی دانش‌آموز", value: model.reviewLabel },
    { label: "نسخه نهایی", value: model.finalLabel },
    { label: "ثبت سنجش", value: model.sanjeshLabel },
  ];
}
