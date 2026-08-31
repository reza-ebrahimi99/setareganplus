import { AtelierReveal } from "@/components/guidance/office/AtelierMotion";

export function AtelierPage({
  kicker,
  title,
  lead,
  now,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  now?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atelier-page">
      <AtelierReveal>
        <header className="atelier-page__hero">
          <p className="atelier-kicker">{kicker}</p>
          <h1 className="atelier-title">{title}</h1>
          <p className="atelier-lead">{lead}</p>
          {now ? (
            <p className="atelier-now-line">
              <span>حالا</span>
              {now}
            </p>
          ) : null}
        </header>
      </AtelierReveal>
      {children}
    </div>
  );
}
