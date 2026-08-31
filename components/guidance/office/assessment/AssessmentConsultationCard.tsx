import Link from "next/link";
import { INTEREST_CONSULTATION } from "@/lib/guidance/office/interest-report";

export function AssessmentConsultationCard() {
  const card = INTEREST_CONSULTATION;

  return (
    <section className="chamber-consult office-assess-print-hide" aria-labelledby="consult-title">
      <p className="chamber-kicker">{card.kicker}</p>
      <h2 id="consult-title">{card.title}</h2>
      <dl>
        <div>
          <dt>مدت</dt>
          <dd>{card.duration}</dd>
        </div>
        <div>
          <dt>قالب</dt>
          <dd>{card.formats.join(" / ")}</dd>
        </div>
      </dl>
      <ul>
        {card.items.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </li>
        ))}
      </ul>
      <p>{card.closing}</p>
      <Link href={card.ctaHref} className="chamber-go">
        {card.ctaLabel}
      </Link>
    </section>
  );
}
