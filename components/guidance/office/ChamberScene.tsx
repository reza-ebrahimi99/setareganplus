export function ChamberScene({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <figure className="chamber-scene">
      {children}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

export function ChamberEmpty({
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
    <div className="chamber-empty" role="status">
      {art}
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
