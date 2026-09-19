import { toPersianDigits } from "@/lib/persian";
import type { CounselorStudentCase } from "@/lib/counselor-os/view-models";

type Props = {
  caseModel: CounselorStudentCase;
  packageTitle: string;
  packageStateLabel: string;
};

export function CounselorStudentCaseHeader({ caseModel, packageTitle, packageStateLabel }: Props) {
  const identityLine = [
    caseModel.gradeName,
    caseModel.examGroupLabel,
    caseModel.mobile,
    caseModel.province,
  ]
    .filter(Boolean)
    .join(" · ");

  const counselorLine = caseModel.assignedCounselor
    ? `${caseModel.assignedCounselor.name} · ${caseModel.assignedCounselor.assignedAtLabel}`
    : "تخصیص نشده";

  return (
    <header className="cos-case-header" dir="rtl">
      <div className="cos-case-header__identity">
        <p className="cos-page__eyebrow">پرونده دانش‌آموز</p>
        <h1>{caseModel.studentName}</h1>
        {identityLine ? <p className="cos-case-header__meta">{identityLine}</p> : null}
      </div>
      <dl className="cos-case-header__metrics">
        <div>
          <dt>وضعیت</dt>
          <dd>{caseModel.studentStatusLabel}</dd>
        </div>
        <div>
          <dt>مشاور پرونده</dt>
          <dd>{counselorLine}</dd>
        </div>
        <div>
          <dt>بسته</dt>
          <dd>
            {packageTitle} · {packageStateLabel}
          </dd>
        </div>
        <div>
          <dt>مرحله فعلی</dt>
          <dd>{caseModel.currentStepTitle ?? "شروع نشده"}</dd>
        </div>
        <div>
          <dt>آخرین مرحله تکمیل‌شده</dt>
          <dd>{caseModel.lastCompletedStepTitle ?? "—"}</dd>
        </div>
        <div>
          <dt>پیشرفت مسیر</dt>
          <dd>
            <span className="cos-case-header__progress-value">
              {toPersianDigits(caseModel.completionPercentage)}٪
            </span>
            <span
              className="cos-case-header__progress-bar"
              role="progressbar"
              aria-valuenow={caseModel.completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="درصد پیشرفت مسیر ۱۸مرحله‌ای"
            >
              <span style={{ width: `${Math.min(100, Math.max(0, caseModel.completionPercentage))}%` }} />
            </span>
          </dd>
        </div>
      </dl>
    </header>
  );
}
