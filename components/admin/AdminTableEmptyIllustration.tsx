type AdminTableEmptyIllustrationProps = {
  className?: string;
};

export function AdminTableEmptyIllustration({
  className = "mx-auto size-20",
}: AdminTableEmptyIllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="8"
        y="14"
        width="64"
        height="52"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-border"
      />
      <path
        d="M8 26h64"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-border"
      />
      <path
        d="M24 26v40M40 26v40M56 26v40"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-border"
      />
      <circle cx="40" cy="44" r="10" stroke="currentColor" strokeWidth="1.5" className="text-secondary/60" />
      <path
        d="M36 44h8M40 40v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-muted"
      />
    </svg>
  );
}
