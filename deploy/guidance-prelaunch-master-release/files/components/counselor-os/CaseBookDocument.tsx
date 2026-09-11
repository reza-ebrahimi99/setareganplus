import { WorkspacePrintButton } from "@/components/admin/guidance/WorkspacePrintButton";
import { SetareganBrandMark } from "@/components/guidance/brand/SetareganBrandMark";
import { HollandRecommendationSection } from "@/components/guidance/journey-v2/HollandRecommendationSection";
import { SETAREGAN_LOGO } from "@/lib/guidance/brand/setaregan-logo";
import { caseBookSectionPresence } from "@/lib/counselor-os/case-book";
import type { CounselorLateJourneyModel } from "@/lib/counselor-os/late-journey";
import type {
  CounselorStudentCase,
  CounselorV2Dossier,
} from "@/lib/counselor-os/view-models";
import { buildHollandRecommendations } from "@/lib/guidance/journey-v2/holland/recommendations";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type FollowUpRow = {
  dueLabel: string;
  statusLabel: string;
  ownerLabel: string;
  note: string;
};

type SessionRow = {
  title: string;
  whenLabel: string | null;
  statusLabel: string;
  notes: string | null;
};

export function CaseBookDocument(props: {
  caseModel: CounselorStudentCase;
  dossier: CounselorV2Dossier;
  late: CounselorLateJourneyModel;
  followUps?: FollowUpRow[];
  sessions?: SessionRow[];
  counselorName?: string;
}) {
  const generated = formatJalaliDateTimeShort(new Date());
  const reco = props.dossier.holland.completed
    ? buildHollandRecommendations({ scores: props.dossier.holland.scores })
    : null;
  const initialItems = props.late.initialList?.items.filter((item) => item.isActive) ?? [];
  const sample = [...initialItems.slice(0, 5), ...initialItems.slice(-3)];
  const presence = caseBookSectionPresence({
    hasIdentity: Object.keys(props.dossier.personal).length > 0,
    hasExamGroups: Boolean(props.dossier.examGroups),
    hasGrades: props.dossier.grades.length > 0,
    hasHolland: props.dossier.holland.completed,
    hasPreferences:
      props.dossier.educationTypes.length +
        props.dossier.provinces.length +
        props.dossier.majors.length >
      0,
    hasPayment: props.dossier.finance.items.length > 0,
    hasDocuments: props.dossier.documents.length > 0,
    hasSession1: Boolean(props.late.firstSession.whenLabel),
    hasKonkur: Boolean(props.late.konkur),
    hasInitialChoices: initialItems.length > 0,
    hasReview: Boolean(props.late.reviewLabel),
    hasSession2: Boolean(props.late.secondSession.whenLabel),
    hasFinal: Boolean(props.late.finalMapped.list),
    hasInformed: Boolean(props.caseModel.packagePaid && props.late.finalLabel),
    hasSanjesh: Boolean(props.late.sanjesh),
    hasFollowUps: Boolean(props.followUps?.length),
    hasAudit: true,
  });

  return (
    <div className="counselor-report counselor-casebook" dir="rtl">
      <header className="counselor-casebook__cover">
        <SetareganBrandMark size={72} />
        <p>{SETAREGAN_LOGO.team}</p>
        <h1>پرونده کامل دانش‌آموز</h1>
        <dl>
          <div>
            <dt>دانش‌آموز</dt>
            <dd>{props.caseModel.studentName}</dd>
          </div>
          <div>
            <dt>شناسه پرونده</dt>
            <dd>{props.dossier.planPublicId ?? props.caseModel.studentId}</dd>
          </div>
          <div>
            <dt>مشاور</dt>
            <dd>{props.counselorName ?? "—"}</dd>
          </div>
          <div>
            <dt>تاریخ تولید</dt>
            <dd>{generated}</dd>
          </div>
          <div>
            <dt>وضعیت</dt>
            <dd>{props.caseModel.studentStatusLabel}</dd>
          </div>
        </dl>
        <WorkspacePrintButton />
      </header>

      {presence.identity ? (
        <section className="counselor-report__step">
          <h2>هویت دانش‌آموز</h2>
          <table className="counselor-report__table">
            <tbody>
              {Object.entries(props.dossier.personal).map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value || "—"}</td>
                </tr>
              ))}
              <tr>
                <th>تماس</th>
                <td>{props.caseModel.mobile ?? "—"}</td>
              </tr>
              <tr>
                <th>مدرسه / پایه</th>
                <td>
                  {[props.caseModel.schoolName, props.caseModel.gradeName]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {presence.examGroups ? (
        <section className="counselor-report__step">
          <h2>گروه‌های آزمایشی</h2>
          <p>اصلی: {props.dossier.examGroups?.primary ?? "—"}</p>
          <p>تکمیلی: {props.dossier.examGroups?.secondary.join("، ") || "—"}</p>
        </section>
      ) : null}

      {presence.grades ? (
        <section className="counselor-report__step">
          <h2>نمرات نهایی</h2>
          <table className="counselor-report__table">
            <tbody>
              {props.dossier.grades.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="counselor-report__step">
        <h2>آزمون رغبت‌سنجی</h2>
        {props.dossier.holland.completed ? (
          <>
            <p>کد غالب: {props.dossier.holland.code}</p>
            <table className="counselor-report__table">
              <tbody>
                {props.dossier.holland.scores.map((score) => (
                  <tr key={score.type}>
                    <th>
                      {score.typeLabel} ({score.type})
                    </th>
                    <td>
                      خام {toPersianDigits(score.raw)} · نرمال {toPersianDigits(score.normalized)}٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reco ? <HollandRecommendationSection model={reco} /> : null}
          </>
        ) : (
          <p>آزمون رغبت‌سنجی هنوز تکمیل نشده است.</p>
        )}
      </section>

      <section className="counselor-report__step">
        <h2>ترجیحات تحصیلی</h2>
        <p>دوره: {props.dossier.educationTypes.join("، ") || "—"}</p>
        <p>استان/شهر: {props.dossier.provinces.join("، ") || "—"}</p>
        <p>رشته: {props.dossier.majors.slice(0, 20).join("، ") || "—"}</p>
        <p>معیارها: {props.dossier.priorities.join(" > ") || "—"}</p>
      </section>

      <section className="counselor-report__step">
        <h2>پرداخت</h2>
        {props.dossier.finance.items.map((item) => (
          <p key={item.kind}>
            {item.title}: {item.amountLabel} · {item.statusLabel}
            {item.discountLabel ? ` · تخفیف ${item.discountLabel}` : ""}
          </p>
        ))}
      </section>

      <section className="counselor-report__step">
        <h2>مدارک</h2>
        <table className="counselor-report__table">
          <thead>
            <tr>
              <th>نوع</th>
              <th>نام فایل</th>
              <th>زمان بارگذاری</th>
              <th>وضعیت</th>
              <th>بررسی‌کننده</th>
            </tr>
          </thead>
          <tbody>
            {props.dossier.documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.title}</td>
                <td>{doc.filename}</td>
                <td>{doc.uploadedLabel}</td>
                <td>{doc.verification}</td>
                <td>
                  {doc.verifiedBy ?? "—"}
                  {doc.reviewNote ? ` · ${doc.reviewNote}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="counselor-report__step">
        <h2>جلسه اول</h2>
        <p>
          {props.late.firstSession.whenLabel ?? "—"} · {props.late.firstSession.statusLabel}
        </p>
      </section>

      <section className="counselor-report__step">
        <h2>نتایج کنکور</h2>
        {(props.late.konkur?.groups ?? []).map((group) => (
          <article key={group.examGroup}>
            <h3>{group.title}</h3>
            <table className="counselor-report__table">
              <tbody>
                {group.fields.map((field) => (
                  <tr key={field.key}>
                    <th>{field.label}</th>
                    <td>
                      {field.currentValue}
                      {field.correction
                        ? ` — اصلاح ${field.correction.actorName}`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
        <p>کارنامه: {props.late.konkur?.document?.filename ?? "بارگذاری نشده"}</p>
      </section>

      <section className="counselor-report__step">
        <h2>چیدمان اولیه</h2>
        <p>
          تعداد انتخاب فعال: {toPersianDigits(initialItems.length)} — فهرست کامل در گزارش جداگانه
          چاپ می‌شود.
        </p>
        {sample.length > 0 ? (
          <table className="counselor-report__table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>کد</th>
                <th>رشته</th>
                <th>دانشگاه</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((item) => (
                <tr key={item.id}>
                  <td>{toPersianDigits(item.sortOrder)}</td>
                  <td dir="ltr">{item.officialCode}</td>
                  <td>{item.major}</td>
                  <td>{item.university}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>هنوز چیدمان اولیه‌ای ثبت نشده است.</p>
        )}
      </section>

      <section className="counselor-report__step">
        <h2>بررسی دانش‌آموز</h2>
        <p>{props.late.reviewLabel}</p>
      </section>

      <section className="counselor-report__step">
        <h2>جلسه دوم</h2>
        <p>
          {props.late.secondSession.whenLabel ?? "—"} · {props.late.secondSession.statusLabel}
        </p>
      </section>

      <section className="counselor-report__step">
        <h2>اصلاح نهایی و تأیید</h2>
        <p>نسخه نهایی: {props.late.finalLabel}</p>
        <p>ثبت سنجش: {props.late.sanjeshLabel}</p>
      </section>

      <section className="counselor-report__step">
        <h2>پیگیری‌ها</h2>
        {props.followUps && props.followUps.length > 0 ? (
          <table className="counselor-report__table">
            <tbody>
              {props.followUps.map((row, index) => (
                <tr key={`${row.dueLabel}-${index}`}>
                  <th>{row.dueLabel}</th>
                  <td>
                    {row.statusLabel} · {row.ownerLabel} · {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>پیگیری ثبت‌شده‌ای نیست.</p>
        )}
      </section>

      <section className="counselor-report__step">
        <h2>خلاصه تغییرات معنادار</h2>
        <p>
          مرحله جاری {toPersianDigits(props.late.currentStep)} · پیشرفت{" "}
          {toPersianDigits(props.caseModel.completionPercentage)}٪
        </p>
        {(props.sessions ?? []).map((session) => (
          <p key={session.title}>
            {session.title}: {session.whenLabel ?? "—"} · {session.statusLabel}
            {session.notes ? ` · ${session.notes}` : ""}
          </p>
        ))}
      </section>
    </div>
  );
}
