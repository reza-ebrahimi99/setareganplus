import { AtelierFloat } from "@/components/guidance/office/AtelierMotion";

export function AtelierScene({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <figure className="atelier-scene">
      <div className="atelier-scene__glass">
        <AtelierFloat>{children}</AtelierFloat>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

export function AtelierEmpty({
  art,
  title,
  body,
  action,
}: {
  art?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="atelier-empty" role="status">
      {art ? <AtelierScene>{art}</AtelierScene> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
