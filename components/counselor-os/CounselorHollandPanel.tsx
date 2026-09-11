import Link from "next/link";
import { HollandScoreChart } from "@/components/counselor-os/HollandScoreChart";
import { HollandRecommendationSection } from "@/components/guidance/journey-v2/HollandRecommendationSection";
import type { CounselorFinanceSummary, CounselorHollandView } from "@/lib/counselor-os/view-models";
import { buildHollandRecommendations } from "@/lib/guidance/journey-v2/holland/recommendations";
import { toPersianDigits } from "@/lib/persian";

export function CounselorHollandPanel({
  studentId,
  holland,
  finance,
}: {
  studentId: string;
  holland: CounselorHollandView;
  finance: CounselorFinanceSummary;
}) {
  return (
    <section className="cos-panel cos-holland-panel">
      <div className="cos-holland-panel__head">
        <div>
          <p className="cos-page__eyebrow">رغبت تحصیلی / شغلی</p>
          <h2>آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی</h2>
          <p className="cos-muted">
            نمایش کامل نتیجه ذخیره‌شده برای مشاور — مستقل از پرداخت دانش‌آموز.
          </p>
        </div>
        <div className="cos-inline-actions">
          <Link
            href={`/admin/counselor/students/${studentId}#holland`}
            className="cos-btn"
          >
            مشاهده گزارش کامل
          </Link>
          <Link
            href={`/admin/counselor/students/${studentId}/export/holland`}
            className="cos-btn cos-btn--primary"
          >
            چاپ / ذخیره PDF
          </Link>
        </div>
      </div>

      <dl className="cos-dl cos-dl--grid">
        <div>
          <dt>وضعیت آزمون</dt>
          <dd>{holland.completed ? "تکمیل شده" : "آزمون رغبت‌سنجی هنوز تکمیل نشده است."}</dd>
        </div>
        <div>
          <dt>تاریخ تکمیل</dt>
          <dd>{holland.completedAtLabel ?? "—"}</dd>
        </div>
        <div>
          <dt>پرداخت رغبت‌سنجی (اطلاعات مالی جدا)</dt>
          <dd>{finance.hollandPaid ? "پرداخت‌شده" : "پرداخت نشده"}</dd>
        </div>
        <div>
          <dt>بسته انتخاب رشته</dt>
          <dd>
            {finance.packageTitle} · {finance.packageStateLabel}
          </dd>
        </div>
      </dl>

      {!holland.completed ? (
        <p className="cos-empty">آزمون رغبت‌سنجی هنوز تکمیل نشده است.</p>
      ) : (
        <>
          <section className="cos-holland-code">
            <span>الگوی غالب</span>
            <strong dir="ltr">{holland.code}</strong>
            <ul>
              {holland.codeLetters.map((letter) => (
                <li key={letter.type}>
                  {letter.type} — {letter.label}
                </li>
              ))}
            </ul>
          </section>

          <HollandScoreChart scores={holland.scores} />

          <div className="cos-table-wrap">
            <table className="cos-table cos-table--wide">
              <thead>
                <tr>
                  <th>رتبه</th>
                  <th>تیپ</th>
                  <th>کد</th>
                  <th>امتیاز خام</th>
                  <th>امتیاز نرمال‌شده</th>
                  <th>شدت</th>
                </tr>
              </thead>
              <tbody>
                {holland.scores.map((score) => (
                  <tr key={score.type}>
                    <td>{toPersianDigits(score.rank)}</td>
                    <td>{score.typeLabel}</td>
                    <td dir="ltr">{score.type}</td>
                    <td>{toPersianDigits(score.raw)}</td>
                    <td>{toPersianDigits(score.normalized)}٪</td>
                    <td>{score.intensity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="cos-subhead">سه تیپ غالب</h3>
          <div className="cos-holland-profiles">
            {holland.topThree.map((profile) => (
              <article key={profile.type} className="cos-holland-profile">
                <header>
                  <small>
                    رتبه {toPersianDigits(profile.rank)} · {profile.intensity}
                  </small>
                  <h4>
                    {profile.typeLabel} ({profile.type})
                  </h4>
                  <strong>{toPersianDigits(profile.normalized)}٪</strong>
                </header>
                <p>{profile.summary}</p>
                <p>
                  <strong>محیط مناسب:</strong> {profile.environment}
                </p>
                <p>
                  <strong>سبک یادگیری:</strong> {profile.studyStyle}
                </p>
                <p>
                  <strong>سبک کاری:</strong> {profile.workStyle}
                </p>
                <p>
                  <strong>نقاط قوت:</strong> {profile.strengths.join("، ")}
                </p>
                <p>
                  <strong>نکات قابل بررسی:</strong> {profile.watchouts.join("، ")}
                </p>
                <p>
                  <strong>حوزه‌های مرتبط:</strong> {profile.fields.join("، ")}
                </p>
              </article>
            ))}
          </div>

          {buildHollandRecommendations({ scores: holland.scores }) ? (
            <HollandRecommendationSection
              model={buildHollandRecommendations({ scores: holland.scores })!}
            />
          ) : null}

          {holland.combinedInterpretation ? (
            <section>
              <h3 className="cos-subhead">تفسیر آموزشی ترکیبی</h3>
              <p className="cos-holland-interpret">{holland.combinedInterpretation}</p>
            </section>
          ) : null}

          <section>
            <h3 className="cos-subhead">جزئیات پاسخ‌های دانش‌آموز</h3>
            {holland.answers.length === 0 ? (
              <p className="cos-empty">پاسخ ذخیره‌شده‌ای برای نمایش وجود ندارد.</p>
            ) : (
              <div className="cos-table-wrap">
                <table className="cos-table cos-table--wide">
                  <thead>
                    <tr>
                      <th>شماره</th>
                      <th>سؤال</th>
                      <th>بُعد</th>
                      <th>پاسخ</th>
                      <th>برچسب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holland.answers.map((row) => (
                      <tr key={row.number}>
                        <td>{toPersianDigits(row.number)}</td>
                        <td>{row.text}</td>
                        <td>
                          {row.typeLabel
                            ? `${row.typeLabel} (${row.typeCode})`
                            : "—"}
                        </td>
                        <td>{row.answer != null ? toPersianDigits(row.answer) : "—"}</td>
                        <td>{row.answerLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
