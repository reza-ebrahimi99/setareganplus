import { toPersianDigits } from "@/lib/persian";

export function WaitingStatusCard(props: {
  title: string;
  body: string;
  meta?: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="gv2-status-card gv2-status-card--premium">
      <p className="gv2-status-card__eyebrow">وضعیت این مرحله</p>
      <h2>{props.title}</h2>
      <p>{props.body}</p>
      {props.meta && props.meta.length > 0 ? (
        <dl className="gv2-dl">
          {props.meta.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{toPersianDigits(row.value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
