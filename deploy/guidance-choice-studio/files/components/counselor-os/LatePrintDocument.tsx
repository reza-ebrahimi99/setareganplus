import { WorkspacePrintButton } from "@/components/admin/guidance/WorkspacePrintButton";
import type { CounselorLateJourneyModel } from "@/lib/counselor-os/late-journey";
import type { CounselorStudentCase, CounselorV2Dossier } from "@/lib/counselor-os/view-models";
import {
  choicePrintRows,
  lateSummaryLines,
  printChoiceCells,
} from "@/lib/counselor-os/late-reports";
import { REPORT_BRAND } from "@/lib/guidance/workspace/exports/report";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import {
  CHOICE_STUDIO_BRAND,
  INITIAL_NONFINAL_DISCLAIMER,
} from "@/lib/guidance/choice-studio/types";
import { labelChoiceStudioState, resolveChoiceStudioState } from "@/lib/guidance/choice-studio/status";

function Letterhead(props: { title: string; studentName: string; badge?: string }) {
  return (
    <>
      <header className="counselor-report__letterhead">
        <div>
          <p className="counselor-report__brand">{CHOICE_STUDIO_BRAND}</p>
          <p>{REPORT_BRAND.institute}</p>
          <p>مشاور مسئول: {REPORT_BRAND.counselor}</p>
        </div>
      </header>
      <h1>{props.title}</h1>
      {props.badge ? <p className="counselor-report__badge">{props.badge}</p> : null}
      <p className="counselor-report__meta">
        {props.studentName} · تولید: {formatJalaliDateTimeShort(new Date())}
      </p>
      <p className="counselor-report__hint">
        دکمه زیر پنجره چاپ را باز می‌کند. مقصد را «Save as PDF» بگذارید، کاغذ A4.
      </p>
      <WorkspacePrintButton />
    </>
  );
}

function ChoiceTable(props: {
  list: ChoiceListView | null;
  showFeedback?: boolean;
  showBand?: boolean;
}) {
  const rows = choicePrintRows(props.list);
  if (rows.length === 0) return <p>انتخاب ثبت‌شده‌ای نیست.</p>;
  return (
    <table className="counselor-report__table counselor-report__table--repeat counselor-choice-print">
      <thead>
        <tr>
          <th>ردیف</th>
          <th>کد رسمی</th>
          <th>دانشگاه / مؤسسه</th>
          <th>رشته</th>
          <th>شهر</th>
          <th>نوع دوره</th>
          {props.showBand ? <th>دسته</th> : null}
          {props.showFeedback ? <th>بازخورد</th> : null}
          <th>یادداشت</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item) => {
          const cells = printChoiceCells(item);
          return (
            <tr key={item.id}>
              <td>{toPersianDigits(cells.order)}</td>
              <td>{cells.code || "—"}</td>
              <td>{cells.university}</td>
              <td>{cells.major}</td>
              <td>{cells.city || "—"}</td>
              <td>{cells.educationType}</td>
              {props.showBand ? <td>{cells.band}</td> : null}
              {props.showFeedback ? <td>{cells.feedback || "—"}</td> : null}
              <td>{cells.note || ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function LatePrintDocument(props: {
  kind: "konkur" | "choices-initial" | "choices-review" | "choices-final" | "summary" | "case";
  caseModel: CounselorStudentCase;
  dossier: CounselorV2Dossier;
  late: CounselorLateJourneyModel;
}) {
  const name = props.caseModel.studentName;
  if (props.kind === "konkur") {
    const groups = props.late.konkur?.groups ?? [];
    return (
      <div className="counselor-report" dir="rtl">
        <Letterhead title="خلاصه نتایج کنکور" studentName={name} />
        <p>سال آزمون: {props.late.konkur?.studentData?.examYear ?? "—"}</p>
        {groups.length > 0 ? (
          groups.map((group) => (
            <section key={group.examGroup}>
              <h2>{group.title}</h2>
              <table className="counselor-report__table">
                <thead>
                  <tr>
                    <th>فیلد</th>
                    <th>ثبت دانش‌آموز</th>
                    <th>مقدار جاری / اصلاح مشاور</th>
                  </tr>
                </thead>
                <tbody>
                  {group.fields.map((f) => (
                    <tr key={f.key}>
                      <th>{f.label}</th>
                      <td>{f.studentValue}</td>
                      <td>
                        {f.currentValue}
                        {f.correction
                          ? ` — ${f.correction.actorName} (${f.correction.createdLabel})`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        ) : (
          <table className="counselor-report__table">
            <thead>
              <tr>
                <th>فیلد</th>
                <th>ثبت دانش‌آموز</th>
                <th>مقدار جاری / اصلاح مشاور</th>
              </tr>
            </thead>
            <tbody>
              {(props.late.konkur?.fields ?? []).map((f) => (
                <tr key={f.key}>
                  <th>{f.label}</th>
                  <td>{f.studentValue}</td>
                  <td>
                    {f.currentValue}
                    {f.correction
                      ? ` — ${f.correction.actorName} (${f.correction.createdLabel})`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p>کارنامه: {props.late.konkur?.document?.filename ?? "بارگذاری نشده"}</p>
      </div>
    );
  }

  if (props.kind === "choices-initial") {
    return (
      <div className="counselor-report counselor-choice-print-doc" dir="rtl">
        <Letterhead title="نسخه اولیه چیدمان انتخاب رشته" studentName={name} badge="غیرنهایی" />
        <p className="counselor-report__disclaimer">{INITIAL_NONFINAL_DISCLAIMER}</p>
        <ChoiceTable list={props.late.initialList} showBand />
        <footer className="counselor-report__footer">{CHOICE_STUDIO_BRAND}</footer>
      </div>
    );
  }

  if (props.kind === "choices-review") {
    return (
      <div className="counselor-report" dir="rtl">
        <Letterhead title="گزارش بررسی دانش‌آموز" studentName={name} />
        <ChoiceTable list={props.late.initialList} showBand showFeedback />
      </div>
    );
  }

  if (props.kind === "choices-final") {
    const finalList = props.late.finalMapped.list;
    const state = resolveChoiceStudioState({
      kind: finalList?.kind,
      status: finalList?.status,
      hasItems: Boolean(finalList?.items.length),
      sanjeshStatus: props.late.sanjesh?.status,
    });
    return (
      <div className="counselor-report counselor-choice-final" dir="rtl">
        <Letterhead
          title="نسخه نهایی انتخاب رشته"
          studentName={name}
          badge={labelChoiceStudioState(state)}
        />
        <p>
          این فهرست برای ورود دستی در سامانه رسمی سازمان سنجش تهیه شده است. چاپ این صفحه به‌معنی ثبت
          خودکار در سنجش نیست.
        </p>
        <ChoiceTable list={finalList} />
        <footer className="counselor-report__footer">{CHOICE_STUDIO_BRAND}</footer>
        <section className="counselor-report__notespace counselor-report__notespace--large">
          <p>یادداشت دستی:</p>
          <div className="counselor-report__lines counselor-report__lines--tall">
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="counselor-report" dir="rtl">
      <Letterhead title="خلاصه نهایی پرونده" studentName={name} />
      <table className="counselor-report__table">
        <tbody>
          {lateSummaryLines(props.late).map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
          <tr>
            <th>بسته</th>
            <td>{props.dossier.finance.packageTitle}</td>
          </tr>
          <tr>
            <th>پیشرفت</th>
            <td>{toPersianDigits(props.dossier.completionPercentage)}٪</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
