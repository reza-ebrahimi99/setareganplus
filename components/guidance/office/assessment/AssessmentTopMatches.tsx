import { toPersianDigits } from "@/lib/persian";
import type { AssessmentConfidence } from "@/lib/guidance/journey/assessment/scoring";
import type { TopMajorMatch } from "@/lib/guidance/office/interest-report";

export function AssessmentTopMatches({
  matches,
  confidence,
}: {
  matches: readonly TopMajorMatch[];
  confidence: AssessmentConfidence;
}) {
  const width = Math.max(6, Math.min(100, confidence.percent));

  return (
    <section className="office-matches">
      <h2>سه گروه رشته‌ای که بیشترین تطابق را با شما دارند</h2>
      <p>
        تطابق یعنی هم‌خوانی وزن‌دار با پاسخ‌های همین آزمون — نه انتخاب نهایی و نه
        پیش‌بینی قبولی. تفسیر با مهندس رضا ابراهیمی است.
      </p>
      <ol>
        {matches.map((item) => (
          <li key={item.clusterId}>
            <div className="office-matches__row">
              <strong>
                {toPersianDigits(item.rank)}. {item.title}
              </strong>
              <span>{toPersianDigits(item.fitScore)}</span>
            </div>
            <div
              className="office-assess__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={item.fitScore}
              aria-label={`هم‌خوانی ${item.title}`}
            >
              <span style={{ width: `${item.barPercent}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <div className="office-matches__confidence">
        <p>
          تمایز پاسخ‌ها: {confidence.label} · {toPersianDigits(confidence.percent)}
        </p>
        <div
          className="office-assess__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={confidence.percent}
        >
          <span style={{ width: `${width}%` }} />
        </div>
        <p>{confidence.explanation}</p>
      </div>
    </section>
  );
}
