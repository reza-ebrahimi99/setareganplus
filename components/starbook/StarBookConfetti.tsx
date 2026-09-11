"use client";

import { useMemo } from "react";

const COLORS = ["#ff4db8", "#3be4ff", "#c8ff4d", "#9b6bff", "#ff7a3d"];

export function StarBookConfetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${6 + index * 5}%`,
        delay: `${index * 40}ms`,
        color: COLORS[index % COLORS.length],
      })),
    [],
  );

  return (
    <div className="starbook-confetti pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((bit) => (
        <i
          key={bit.id}
          style={{
            left: bit.left,
            background: bit.color,
            animationDelay: bit.delay,
          }}
        />
      ))}
    </div>
  );
}
