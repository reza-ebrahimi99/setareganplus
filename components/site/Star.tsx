/** The logo star — used as a recurring motif. */
export function Star({ className = "", filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 1.8l2.95 6.6 7.2.7-5.43 4.8 1.6 7.07L12 17.3l-6.32 3.67 1.6-7.07L1.85 9.1l7.2-.7L12 1.8z"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={filled ? 0 : 1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Eyebrow({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "edu" | "gc" | "light" }) {
  const c = { gold: "text-gold", edu: "text-edu", gc: "text-gc", light: "text-gold" }[tone];
  return (
    <span className={`eyebrow ${tone === "light" ? "text-white/75" : ""}`}>
      <Star className={`size-3.5 ${c}`} />
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  text,
  tone,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  tone?: "gold" | "edu" | "gc";
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
        <h2 className="h-section mt-2">{title}</h2>
        {text && <p className="mt-3 text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  text,
  accent = "gold",
  children,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  accent?: "gold" | "edu" | "gc";
  children?: React.ReactNode;
}) {
  const bar = { gold: "bg-gold", edu: "bg-edu", gc: "bg-gc" }[accent];
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <Star filled={false} className="pointer-events-none absolute -top-16 -left-10 size-72 text-line" />
      <div className="container-x relative py-12 sm:py-16">
        <span className={`mb-5 block h-1 w-12 rounded-full ${bar}`} />
        {eyebrow && <Eyebrow tone={accent}>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 text-3xl leading-snug font-extrabold text-navy sm:text-4xl">{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-lg text-muted">{text}</p>}
        {children}
      </div>
    </section>
  );
}
