import { toPersianDigits } from "@/lib/persian";

type Props = {
  alerts: string[];
  needsReview?: { step: number | null } | null;
};

export function CounselorStudentCaseAlerts({ alerts, needsReview }: Props) {
  const items: Array<{ key: string; tone: "review" | "info"; message: string }> = [];

  if (needsReview) {
    items.push({
      key: "needs-review",
      tone: "review",
      message: needsReview.step
        ? `نیازمند بررسی مجدد — دانش‌آموز مرحله ${toPersianDigits(needsReview.step)} را پس از شروع کار مشاور ویرایش کرده است.`
        : "نیازمند بررسی مجدد — دانش‌آموز اطلاعات قبلی را پس از شروع کار مشاور تغییر داده است.",
    });
  }

  for (const a of alerts) {
    items.push({ key: a, tone: "info", message: a });
  }

  if (items.length === 0) return null;

  return (
    <ul className="cos-case-alerts" aria-live="polite">
      {items.map((item) => (
        <li
          key={item.key}
          className={`cos-case-alerts__item cos-case-alerts__item--${item.tone}`}
          role="status"
        >
          <span className="cos-case-alerts__icon" aria-hidden="true">
            !
          </span>
          <span>{item.message}</span>
        </li>
      ))}
    </ul>
  );
}
