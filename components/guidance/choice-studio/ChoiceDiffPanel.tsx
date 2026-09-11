import { labelDiffKind, type DiffableChoice, diffChoiceLists } from "@/lib/guidance/choice-studio/diff";
import { toPersianDigits } from "@/lib/persian";

export function ChoiceDiffPanel(props: {
  initial: DiffableChoice[];
  final: DiffableChoice[];
}) {
  const diff = diffChoiceLists(props.initial, props.final);
  return (
    <section className="gcs-diff">
      <div className="gcs-summary">
        <article>
          <span>افزوده‌شده</span>
          <strong>{toPersianDigits(diff.added)}</strong>
        </article>
        <article>
          <span>حذف‌شده</span>
          <strong>{toPersianDigits(diff.removed)}</strong>
        </article>
        <article>
          <span>جابه‌جا‌شده</span>
          <strong>{toPersianDigits(diff.moved)}</strong>
        </article>
        <article>
          <span>بدون تغییر</span>
          <strong>{toPersianDigits(diff.unchanged)}</strong>
        </article>
      </div>
      <ul className="gcs-diff__list">
        {diff.rows
          .filter((row) => row.kind !== "UNCHANGED")
          .slice(0, 80)
          .map((row, index) => (
            <li key={`${row.kind}-${row.code}-${index}`} data-kind={row.kind}>
              <em>{labelDiffKind(row.kind)}</em>
              <strong>{row.code}</strong>
              <span>
                {row.major} · {row.university}
              </span>
              <small>
                {row.kind === "MOVED"
                  ? `از اولویت ${toPersianDigits(row.fromPriority ?? 0)} به ${toPersianDigits(row.toPriority ?? 0)}`
                  : row.detail}
              </small>
            </li>
          ))}
      </ul>
    </section>
  );
}
