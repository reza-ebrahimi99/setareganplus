"use client";

export function CounselorV2EditReasonFields() {
  return (
    <div className="cos-form-stack cos-counselor-edit-reason" dir="rtl">
      <label>
        دلیل ویرایش (الزامی)
        <textarea name="editReason" rows={2} required minLength={3} />
      </label>
      <p className="cos-muted">
        پرداخت، رزرو جلسه و چرخه entitlement از این فرم قابل تغییر نیستند.
      </p>
    </div>
  );
}
