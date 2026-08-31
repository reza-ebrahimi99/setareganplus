import { toPersianDigits } from "@/lib/persian";
import { getAssessmentCategory } from "@/lib/guidance/journey/assessment/categories";
import type { CategoryScore } from "@/lib/guidance/journey/assessment/scoring";

export function AssessmentRadar({ scores }: { scores: readonly CategoryScore[] }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 118;
  const n = scores.length;
  if (n === 0) return null;

  function point(index: number, ratio: number): [number, number] {
    const angle = -Math.PI / 2 + (index / n) * 2 * Math.PI;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio];
  }

  const grid = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const pts = scores.map((_, i) => point(i, ratio).join(",")).join(" ");
    return <polygon key={ratio} points={pts} className="chamber-radar-grid" />;
  });

  const axes = scores.map((_, i) => {
    const [x, y] = point(i, 1);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="chamber-radar-axis" />;
  });

  const poly = scores
    .map((row, i) => point(i, Math.max(0.04, row.normalizedScore / 100)).join(","))
    .join(" ");

  return (
    <div className="chamber-radar-wrap">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="chamber-radar"
        role="img"
        aria-label="نمودار راداری ابعاد آزمون"
      >
        {grid}
        {axes}
        <polygon points={poly} className="chamber-radar-fill" />
      </svg>
      <ol className="chamber-radar-legend">
        {scores.map((row, i) => {
          const def = getAssessmentCategory(row.categoryId);
          return (
            <li key={row.categoryId}>
              <span>{toPersianDigits(i + 1)}</span>
              <strong>{def?.title ?? row.categoryId}</strong>
              <em>{toPersianDigits(row.normalizedScore)}</em>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
