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
  return (
    <section className="chamber-ranks">
      <h2>سه گروه رشته‌ای که بیشترین تطابق را با شما دارند</h2>
      <p>
        تطابق یعنی هم‌خوانی وزن‌دار با پاسخ‌های همین آزمون — نه انتخاب نهایی و نه
        پیش‌بینی قبولی. تفسیر با مهندس رضا ابراهیمی است.
      </p>
      <ol>
        {matches.map((item) => (
          <li key={item.clusterId}>
            <div className="chamber-ranks__row">
              <strong>
                {toPersianDigits(item.rank)}. {item.title}
              </strong>
              <span>{toPersianDigits(item.fitScore)}</span>
            </div>
          </li>
        ))}
      </ol>
      <p>
        تمایز پاسخ‌ها: {confidence.label} · {toPersianDigits(confidence.percent)}
      </p>
      <p>{confidence.explanation}</p>
    </section>
  );
}
