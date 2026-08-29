import { toPersianDigits } from "@/lib/persian";

type PortalProgressRingProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  caption?: string;
  className?: string;
};

/**
 * CSS conic progress ring — no chart library.
 * Server Component safe.
 */
export function PortalProgressRing({
  percent,
  size = 112,
  strokeWidth = 10,
  label,
  caption,
  className,
}: PortalProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={["portal-progress-ring", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `پیشرفت ${toPersianDigits(clamped)} درصد`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="portal-progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className="portal-progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="portal-progress-ring__center">
        <span className="portal-progress-ring__percent">
          {toPersianDigits(clamped)}٪
        </span>
        {caption ? (
          <span className="portal-progress-ring__caption">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
