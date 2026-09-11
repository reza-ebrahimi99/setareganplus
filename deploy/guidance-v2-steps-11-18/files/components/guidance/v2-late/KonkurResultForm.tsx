"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  submitKonkurResultAction,
  type LateFormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/late";
import {
  KONKUR_PARTICIPATION,
  KONKUR_QUOTA_OPTIONS,
  type GuidanceExamGroup,
} from "@/lib/guidance/journey-v2/constants";
import {
  konkurResultFieldName,
  prefillForExamGroup,
  type KonkurFieldView,
  type KonkurResultData,
} from "@/lib/guidance/journey-v2/konkur-shared";
import { GUIDANCE_EXAM_GROUP_LABELS } from "@/lib/guidance/journey/reference-data/majors";
import { labelKonkurGroupSection } from "@/lib/guidance/journey-v2/labels";
import { GuidanceFileUploadField } from "@/components/guidance/shared/GuidanceFileUploadField";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import {
  FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES,
  FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES,
} from "@/lib/forms/file-upload-config";
import { toPersianDigits } from "@/lib/persian";

const KONKUR_UPLOAD_ACCEPT = FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES.join(",");
const KONKUR_UPLOAD_MAX_MB = Math.round(FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES / (1024 * 1024));
const KONKUR_UPLOAD_HELPER = `فرمت‌های مجاز: PDF، JPG، PNG، WEBP · حداکثر ${toPersianDigits(KONKUR_UPLOAD_MAX_MB)} مگابایت`;

const initial: LateFormState = {};

function GroupResultFields(props: {
  examGroup: GuidanceExamGroup;
  prefill: ReturnType<typeof prefillForExamGroup>;
  errors: Record<string, string>;
}) {
  const n = (field: string) => konkurResultFieldName(props.examGroup, field);
  const e = props.errors;
  const p = props.prefill;

  return (
    <div className="gv2-form-grid">
      <label>
        وضعیت شرکت / نتیجه
        <select name={n("participationStatus")} defaultValue={p?.participationStatus ?? "participated"} required>
          {KONKUR_PARTICIPATION.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {e[n("participationStatus")] ? <em>{e[n("participationStatus")]}</em> : null}
      </label>
      <label>
        سهمیه
        <select name={n("quota")} defaultValue={p?.quota ?? ""}>
          <option value="">انتخاب کنید</option>
          {KONKUR_QUOTA_OPTIONS.map((q) => (
            <option key={q.id} value={q.id}>
              {q.label}
            </option>
          ))}
        </select>
        {e[n("quota")] ? <em>{e[n("quota")]}</em> : null}
      </label>
      <label>
        رتبه در سهمیه
        <input name={n("quotaRank")} inputMode="numeric" defaultValue={p?.quotaRank ?? ""} />
        {e[n("quotaRank")] ? <em>{e[n("quotaRank")]}</em> : null}
      </label>
      <label>
        رتبه کشوری
        <input name={n("nationalRank")} inputMode="numeric" defaultValue={p?.nationalRank ?? ""} />
        {e[n("nationalRank")] ? <em>{e[n("nationalRank")]}</em> : null}
      </label>
      <label>
        نمره کل / تراز
        <input name={n("totalScore")} inputMode="decimal" defaultValue={p?.totalScore ?? ""} />
        {e[n("totalScore")] ? <em>{e[n("totalScore")]}</em> : null}
      </label>
      <label>
        نمره کل سابقه تحصیلی
        <input name={n("academicRecordScore")} inputMode="decimal" defaultValue={p?.academicRecordScore ?? ""} />
        {e[n("academicRecordScore")] ? <em>{e[n("academicRecordScore")]}</em> : null}
      </label>
      <label>
        نمره کل آزمون اختصاصی
        <input name={n("specificTestScore")} inputMode="decimal" defaultValue={p?.specificTestScore ?? ""} />
        {e[n("specificTestScore")] ? <em>{e[n("specificTestScore")]}</em> : null}
      </label>
      <label>
        نمره کل نهایی
        <input name={n("finalScore")} inputMode="decimal" defaultValue={p?.finalScore ?? ""} />
        {e[n("finalScore")] ? <em>{e[n("finalScore")]}</em> : null}
      </label>
      <label>
        منطقه / قطب (در صورت درج در کارنامه)
        <input name={n("region")} defaultValue={p?.region ?? ""} />
        {e[n("region")] ? <em>{e[n("region")]}</em> : null}
      </label>
      <label className="gv2-span-2">
        توضیح این گروه
        <textarea name={n("note")} rows={3} defaultValue={p?.note ?? ""} />
        {e[n("note")] ? <em>{e[n("note")]}</em> : null}
      </label>
    </div>
  );
}

export function KonkurResultForm(props: {
  selected: { primary: GuidanceExamGroup; secondary: readonly GuidanceExamGroup[] };
  prefill: KonkurResultData | null;
  fields: KonkurFieldView[];
  documentName: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitKonkurResultAction, initial);
  if (state.ok) router.replace(guidanceJourneyV2StepPath(13));
  const e = state.fieldErrors ?? {};
  const ordered: GuidanceExamGroup[] = [props.selected.primary, ...props.selected.secondary];
  const multi = props.selected.secondary.length > 0;

  return (
    <form action={action} className="gv2-form" noValidate>
      {state.error ? <p className="gpj-banner gpj-banner--error">{state.error}</p> : null}
      <p className="gv2-muted">
        {multi
          ? `نتایج را جداگانه برای گروه اصلی (${GUIDANCE_EXAM_GROUP_LABELS[props.selected.primary]}) و گروه‌های شناور انتخاب‌شده در مرحله ۲ وارد کنید. اعداد باید مطابق کارنامه رسمی سنجش باشد.`
          : "اعداد را مطابق کارنامه رسمی وارد کنید. مقدار دانش‌آموز و مقدار اصلاح‌شده توسط مشاور جداگانه نمایش داده می‌شود."}
      </p>

      {props.fields.some((f) => f.corrected) ? (
        <section className="gv2-panel">
          <h3>مقادیر جاری پرونده</h3>
          <ul className="gv2-correction-list">
            {props.fields.filter((f) => f.corrected).map((f) => (
              <li key={f.key}>
                <strong>{f.label}</strong>
                <span>ثبت دانش‌آموز: {f.studentValue}</span>
                <span>مقدار تأییدشده مشاور: {f.currentValue}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="gv2-form-grid">
        <label>
          سال آزمون (شمسی)
          <input name="examYear" inputMode="numeric" defaultValue={props.prefill?.examYear ?? ""} required />
          {e.examYear ? <em>{e.examYear}</em> : null}
        </label>
      </div>

      {ordered.map((examGroup, index) => (
        <section key={examGroup} className="gv2-konkur-group">
          <p className="gv2-konkur-group__eyebrow">
            {index === 0 ? "گروه اصلی" : "گروه شناور"}
          </p>
          <h3>{labelKonkurGroupSection(examGroup, index === 0 ? "primary" : "floating")}</h3>
          <p className="gv2-muted">گروه آزمایشی این بخش از انتخاب مرحله ۲ خوانده شده و قابل تغییر نیست.</p>
          <GroupResultFields
            examGroup={examGroup}
            prefill={prefillForExamGroup(props.prefill, examGroup)}
            errors={e}
          />
        </section>
      ))}

      <GuidanceFileUploadField
        name="file"
        title="تصویر یا PDF کارنامه رسمی سنجش"
        description="کارنامه رسمی سازمان سنجش را به صورت تصویر یا فایل PDF بارگذاری کنید."
        helper={KONKUR_UPLOAD_HELPER}
        prompt="فایل خود را اینجا بکشید و رها کنید"
        emptyStateLabel="یا"
        actionLabel="انتخاب فایل"
        selectedActionLabel="تغییر فایل"
        accept={KONKUR_UPLOAD_ACCEPT}
        existingLabel={props.documentName ? `فایل فعلی: ${props.documentName}` : null}
        error={e.file ?? null}
      />

      <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={pending}>
        {pending ? "در حال ذخیره…" : "ذخیره نتایج و ادامه"}
      </button>
    </form>
  );
}
