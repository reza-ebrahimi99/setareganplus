import type { HollandRecommendationModel } from "@/lib/guidance/journey-v2/holland/recommendations";

export function HollandRecommendationSection({
  model,
  className = "",
}: {
  model: HollandRecommendationModel;
  className?: string;
}) {
  return (
    <section className={`gjv2-holland-reco ${className}`.trim()} aria-labelledby="holland-reco-title">
      <header className="gjv2-holland-reco__head">
        <p>آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی</p>
        <h3 id="holland-reco-title">{model.title}</h3>
        <p>{model.disclaimer}</p>
      </header>
      <div className="gjv2-holland-reco__groups">
        {model.groups.map((group) => (
          <article key={group.key} className={`gjv2-holland-reco__group gjv2-holland-reco__group--${group.key}`}>
            <h4>{group.title}</h4>
            <ul>
              {group.items.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.note}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
