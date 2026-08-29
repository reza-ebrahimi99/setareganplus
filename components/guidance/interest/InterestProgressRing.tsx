"use client";

import { toPersianDigits } from "@/lib/persian";

type InterestProgressRingProps = {
  percent: number;
  label?: string;
  size?: number;
};

/**
 * Large animated progress ring — CSS only, respects reduced motion.
 */
export function InterestProgressRing({
  percent,
  label,
  size = 148,
}: InterestProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="interest-ring"
      role="img"
      aria-label={label ?? `پیشرفت ${toPersianDigits(clamped)} درصد`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="interest-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="interest-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="interest-ring__label">
        <strong>{toPersianDigits(clamped)}٪</strong>
        {label ? <span>{label}</span> : null}
      </div>
    </div>
  );
}
