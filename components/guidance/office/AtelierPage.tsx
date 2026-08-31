import { AtelierReveal } from "@/components/guidance/office/AtelierMotion";
import { AtelierScene } from "@/components/guidance/office/AtelierScene";

export function AtelierPage({
  kicker,
  title,
  lead,
  now,
  art,
  artCaption,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  now?: string;
  art?: React.ReactNode;
  artCaption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atelier-page">
      <AtelierReveal>
        <header className="atelier-hero">
          <div className="atelier-hero__copy">
            <p className="atelier-kicker">{kicker}</p>
            <h1 className="atelier-title">{title}</h1>
            <p className="atelier-lead">{lead}</p>
            {now ? (
              <p className="atelier-now-line">
                <span>حالا</span>
                {now}
              </p>
            ) : null}
          </div>
          {art ? <AtelierScene caption={artCaption}>{art}</AtelierScene> : null}
        </header>
      </AtelierReveal>
      <AtelierReveal delay={0.12}>{children}</AtelierReveal>
    </div>
  );
}
