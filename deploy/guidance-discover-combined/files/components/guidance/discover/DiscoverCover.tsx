/**
 * Legacy Discover photo strip.
 *
 * University/program details must not show unrelated school/classroom photos.
 * Remaining callers (pathways/careers) get a compact mark only — no gallery
 * hash, no invented campus photography.
 */
export function DiscoverCover({ title }: { slug: string; title?: string }) {
  return (
    <div className="discover-cover discover-cover--mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        <path
          d="M10 52h44M16 52V26h32v26M22 32h6M36 32h6M22 40h6M36 40h6M28 52V44h8v8"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M14 26 32 14l18 12"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
      {title ? <span>{title}</span> : null}
    </div>
  );
}
