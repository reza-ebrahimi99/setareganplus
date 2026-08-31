import { ChamberReveal } from "@/components/guidance/office/ChamberMotion";
import { ChamberScene } from "@/components/guidance/office/ChamberScene";

export function ChamberPage({
  kicker,
  title,
  lead,
  now,
  action,
  art,
  artCaption,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  now?: string;
  action?: React.ReactNode;
  art?: React.ReactNode;
  artCaption?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <ChamberReveal>
        <header className="chamber-hero">
          <div>
            <p className="chamber-kicker">{kicker}</p>
            <h1 className="chamber-title">{title}</h1>
            <p className="chamber-lead">{lead}</p>
            {now ? <p className="chamber-lead">{now}</p> : null}
            {action}
          </div>
          {art ? <ChamberScene caption={artCaption}>{art}</ChamberScene> : null}
        </header>
      </ChamberReveal>
      <ChamberReveal delay={0.14}>{children}</ChamberReveal>
    </div>
  );
}
