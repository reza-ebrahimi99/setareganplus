type IconProps = {
  className?: string;
};

/** Medal glyph used by RankMedal — matches the project SVG icon style. */
export function MedalIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="10" r="5.25" />
      <path d="M9.25 14.75 8 21l4-2.25L16 21l-1.25-6.25" />
      <path d="M12 7.25v5.5M9.75 9.5h4.5" />
    </svg>
  );
}
