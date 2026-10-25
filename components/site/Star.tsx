import Link from "next/link";
import { breadcrumbLd, type Crumb } from "@/lib/ld";
import { JsonLd } from "./JsonLd";

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

/** Four-point sparkle used for decoration. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z" fill="currentColor" />
    </svg>
  );
}

const ICONS = {
  bag: <><path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" /><path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" /></>,
  form: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" strokeLinecap="round" /></>,
  phone: <path d="M5 4h3.5l1.6 4-2.1 1.4a10.5 10.5 0 0 0 5.6 5.6l1.4-2.1 4 1.6V18a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" strokeLinejoin="round" /><circle cx="12" cy="9.5" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" strokeLinecap="round" /></>,
  arrow: <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" strokeLinejoin="round" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" strokeLinejoin="round" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" strokeLinejoin="round" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" strokeLinecap="round" /></>,
  cap: <><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5 2.5 9Z" strokeLinejoin="round" /><path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5" strokeLinecap="round" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" strokeLinecap="round" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z" strokeLinejoin="round" /><path d="m8.8 12 2.3 2.3L15.5 10" strokeLinecap="round" strokeLinejoin="round" /></>,
  sms: <><path d="M4 5h16v11H9l-5 4V5Z" strokeLinejoin="round" /><path d="M8 10h8M8 13h5" strokeLinecap="round" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5" strokeLinecap="round" /></>,
  chat: <><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z" strokeLinejoin="round" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  home: <><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4v-9.5Z" strokeLinejoin="round" /></>,
  image: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" strokeLinejoin="round" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" /></>,
  news: <><path d="M4 9.5v5h3l7 4.5V5L7 9.5H4Z" strokeLinejoin="round" /><path d="M17.5 9a4 4 0 0 1 0 6M7 14.5 8.5 20h2.5" strokeLinecap="round" strokeLinejoin="round" /></>,
  share: <><circle cx="17" cy="5.5" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17" cy="18.5" r="2.5" /><path d="m8.7 10.8 6.1-3.9M8.7 13.2l6.1 3.9" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8h.01" strokeLinecap="round" /></>,
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-5", strokeWidth = 1.8 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      {ICONS[name]}
    </svg>
  );
}

export function Eyebrow({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "edu" | "gc" | "light" }) {
  const c = { gold: "text-gold", edu: "text-edu", gc: "text-gc", light: "text-gold" }[tone];
  return (
    <span className={`eyebrow ${tone === "light" ? "!border-white/15 !bg-white/10 !text-white/85 !shadow-none backdrop-blur" : ""}`}>
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
  center = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  text?: string;
  tone?: "gold" | "edu" | "gc";
  action?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`reveal mb-8 flex flex-col gap-4 sm:mb-12 [&>a]:self-start sm:[&>a]:self-auto ${center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"}`}>
      <div className={`max-w-2xl ${center ? "mx-auto" : ""}`}>
        {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
        <h2 className="h-section mt-3">{title}</h2>
        {text && <p className="mt-3 text-[1.02rem] leading-8 text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

/** Dark gradient hero for inner pages. */
export function PageHero({
  eyebrow,
  title,
  text,
  accent = "gold",
  crumbs,
  trail = [],
  children,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  accent?: "gold" | "edu" | "gc";
  /** label of the current page in the breadcrumb (defaults to eyebrow/title) */
  crumbs?: string;
  /** intermediate breadcrumb levels between Home and this page */
  trail?: Crumb[];
  children?: React.ReactNode;
}) {
  const here = crumbs ?? eyebrow ?? title;
  const glow = { gold: "bg-gold/30", edu: "bg-royal/50", gc: "bg-gc/45" }[accent];
  return (
    <section className="bg-hero relative overflow-hidden text-white">
      <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_80%_at_70%_20%,black,transparent)]" />
      <div className={`pointer-events-none absolute -top-24 left-[12%] size-72 rounded-full blur-3xl ${glow}`} />
      <Star filled={false} className="pointer-events-none absolute -bottom-24 -left-16 size-80 text-white/[0.06]" />
      <Sparkle className="animate-twinkle pointer-events-none absolute top-10 left-[30%] size-3 text-gold" />
      <Sparkle className="animate-twinkle pointer-events-none absolute bottom-12 left-[18%] size-2 text-white/70 [animation-delay:1.2s]" />
      <div className="container-x relative pt-10 pb-12 sm:pt-14 sm:pb-16">
        <JsonLd data={breadcrumbLd([...trail, { name: here }])} />
        <nav aria-label="مسیر صفحه" className="rise mb-4 flex flex-wrap items-center gap-1.5 text-xs text-white/55">
          <Link href="/" className="hover:text-white">خانه</Link>
          {trail.map((c) => (
            <span key={c.name} className="flex items-center gap-1.5">
              <Icon name="arrow" className="size-3" />
              {c.href ? <Link href={c.href} className="hover:text-white">{c.name}</Link> : <span>{c.name}</span>}
            </span>
          ))}
          <Icon name="arrow" className="size-3" />
          <span className="text-white/80" aria-current="page">{here}</span>
        </nav>
        {eyebrow && <span className="rise"><Eyebrow tone="light">{eyebrow}</Eyebrow></span>}
        <h1 className="rise rise-1 mt-4 max-w-3xl text-[1.9rem] leading-[1.4] font-black tracking-tight sm:text-5xl sm:leading-[1.3]">{title}</h1>
        {text && <p className="rise rise-2 mt-4 max-w-2xl text-[1.05rem] leading-8 text-white/70 sm:text-lg sm:leading-9">{text}</p>}
        {children && <div className="rise rise-3">{children}</div>}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-white/25 to-transparent" />
    </section>
  );
}
