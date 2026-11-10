import Link from "next/link";
import { fa } from "@/lib/format";
import { formatToman } from "@/lib/shop/config";
import { coursePrice, fieldsLabel, formatLength, levelLabel, type PriceInput } from "@/lib/classes/catalog";

const PALETTES = [
  ["#0a1a3f", "#2f5bea"],
  ["#16306e", "#5b3df5"],
  ["#1a2744", "#c89210"],
  ["#10224f", "#3d7eff"],
  ["#241447", "#2f5bea"],
  ["#0e2a28", "#1aa37a"],
];

export function palette(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export function Cover({ slug, title, teacher, cover }: { slug: string; title: string; teacher: string; cover?: string | null }) {
  if (cover) return <img src={cover} alt="" className="cl-cover-img" />;
  const [a, b] = palette(slug);
  return (
    <div className="cl-cover" style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute -top-4 -left-4 size-28 text-white/10">
        <path fill="currentColor" d="M12 1.8l2.95 6.6 7.2.7-5.43 4.8 1.6 7.07L12 17.3l-6.32 3.67 1.6-7.07L1.85 9.1l7.2-.7L12 1.8z" />
      </svg>
      <p className="relative text-xs font-semibold text-white/75">{teacher}</p>
      <p className="cl-display relative mt-1 text-xl">{title}</p>
    </div>
  );
}

export function PriceTag({ course, light = false }: { course: PriceInput; light?: boolean }) {
  const p = coursePrice(course);
  if (p.kind === "free") {
    return (
      <span className="inline-flex items-center gap-2">
        {p.list != null && <span className={`text-sm line-through ${light ? "text-white/60" : "cl-muted"}`}>{formatToman(p.list)}</span>}
        <span className="cl-badge cl-badge-free">رایگان</span>
      </span>
    );
  }
  if (p.kind === "sale") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className={`text-sm line-through ${light ? "text-white/60" : "cl-muted"}`}>{formatToman(p.list)}</span>
        <b className={light ? "text-white" : ""}>{formatToman(p.sale)}</b>
        <span className="cl-badge cl-badge-off">{fa(p.off)}٪</span>
      </span>
    );
  }
  return <b className={light ? "text-white" : ""}>{p.price > 0 ? formatToman(p.price) : "رایگان"}</b>;
}

export function Ring({ value, label }: { value: number; label?: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 44 44" className="size-11" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" className="text-black/10" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#2f5bea" strokeWidth="4" strokeLinecap="round" className="cl-ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 22 22)" />
      </svg>
      <span className="text-sm font-extrabold">{label ?? `${fa(Math.round(v * 100))}٪`}</span>
    </span>
  );
}

export function EmptyState({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return (
    <div className="cl-card px-6 py-14 text-center">
      <svg viewBox="0 0 120 80" className="mx-auto mb-4 h-20 w-28" aria-hidden="true">
        <rect x="8" y="18" width="70" height="48" rx="10" fill="#2f5bea" opacity="0.15" />
        <rect x="28" y="10" width="78" height="52" rx="12" fill="#0a1a3f" />
        <polygon points="58,28 58,46 74,37" fill="#f4b21b" />
        <circle cx="96" cy="18" r="8" fill="#f4b21b" />
      </svg>
      <p className="cl-display text-xl">{title}</p>
      <p className="cl-muted mx-auto mt-2 max-w-md text-sm leading-7">{text}</p>
      {href && action && <Link href={href} className="btn-gold mt-5 inline-flex">{action}</Link>}
    </div>
  );
}

export function MetaLine({ lessons, seconds, grades, fields }: { lessons: number; seconds: number; grades: string[]; fields: string[] }) {
  return (
    <p className="cl-muted text-sm">
      {fa(lessons)} جلسه
      {seconds > 0 && <> · {fa(formatLength(seconds))}</>}
      {" · "}
      {levelLabel(grades)}
      {" · "}
      {fieldsLabel(fields)}
    </p>
  );
}
