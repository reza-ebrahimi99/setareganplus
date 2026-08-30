/**
 * Decorative hero illustration — original, not a third-party replica.
 */

export function GuidanceEntryHeroArt() {
  return (
    <div className="guidance-entry__art" aria-hidden="true">
      <svg viewBox="0 0 640 720" className="guidance-entry__art-svg">
        <defs>
          <linearGradient id="ge-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe08a" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#8a6a12" />
          </linearGradient>
          <linearGradient id="ge-purple" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#5b3df5" />
          </linearGradient>
          <filter id="ge-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="420" cy="220" r="168" fill="none" stroke="url(#ge-gold)" strokeWidth="1.4" opacity="0.55" />
        <circle cx="420" cy="220" r="118" fill="none" stroke="url(#ge-purple)" strokeWidth="1.2" opacity="0.4" />
        <circle cx="420" cy="220" r="64" fill="url(#ge-gold)" opacity="0.18" filter="url(#ge-glow)" />
        <path
          d="M120 560 C 210 420, 300 390, 420 220"
          fill="none"
          stroke="url(#ge-gold)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M90 610 C 200 500, 340 470, 500 300"
          fill="none"
          stroke="url(#ge-purple)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.45"
        />
        {[
          [180, 500],
          [260, 430],
          [340, 340],
          [420, 220],
          [510, 280],
          [140, 580],
        ].map(([x, y], index) => (
          <circle key={`${x}-${y}-${index}`} cx={x} cy={y} r={index === 3 ? 7 : 4.5} fill="url(#ge-gold)" />
        ))}
        <g opacity="0.9">
          <rect x="86" y="88" width="168" height="210" rx="28" fill="rgb(255 255 255 / 0.08)" stroke="url(#ge-gold)" />
          <path d="M112 132 h116 M112 158 h92 M112 184 h108" stroke="rgb(255 255 255 / 0.55)" strokeWidth="3" />
          <circle cx="170" cy="236" r="22" fill="none" stroke="url(#ge-gold)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
