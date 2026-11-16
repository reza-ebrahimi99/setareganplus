import { isAparatProfile } from "@/lib/social";

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function InstagramGlyph({ className = "size-4" }: { className?: string }) {
  const stroke = { fill: "none" as const, stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...stroke}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SocialIcon({ url, className = "size-4" }: { url: string; className?: string }) {
  if (isAparatProfile(url)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <rect width="24" height="24" rx="6" fill="#ED145B" />
        <path d="M9.1 7.2v9.6L17.2 12 9.1 7.2Z" fill="#fff" />
      </svg>
    );
  }
  const h = host(url);
  const stroke = { fill: "none" as const, stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (h === "instagram.com") return <InstagramGlyph className={className} />;
  if (h === "t.me" || h.endsWith("telegram.org") || h.endsWith("telegram.me")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...stroke}>
        <path d="M20.5 5.2 3.8 11.2c-.9.3-.9 1.6.1 1.9l4.2 1.3 1.6 4.9c.3.9 1.5 1 2 .2l2.3-2.2 4.3 3.2c.7.5 1.7.1 1.9-.8l2.4-12.2c.2-1-.7-1.8-1.6-1.5Z" />
      </svg>
    );
  }
  if (h === "ble.ir" || h.endsWith(".bale.ai") || h === "bale.ai") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...stroke}>
        <path d="M5 6.5h10.5A3.5 3.5 0 0 1 19 10v3.5A3.5 3.5 0 0 1 15.5 17H9l-4 3v-3.2A3.5 3.5 0 0 1 5 13.5v-7Z" />
      </svg>
    );
  }
  return null;
}

export function SocialLinks({ items, tone = "dark" }: { items: { label: string; url: string }[]; tone?: "dark" | "light" }) {
  if (!items.length) return null;
  const cls = tone === "dark"
    ? "glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/15 hover:text-white"
    : "btn-ghost inline-flex items-center gap-2 px-5 py-2 text-sm";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className={cls}>
          <SocialIcon url={s.url} />
          {s.label}
        </a>
      ))}
    </div>
  );
}
