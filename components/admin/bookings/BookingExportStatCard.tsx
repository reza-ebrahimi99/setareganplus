/**
 * Premium ERP-style stat card for the booking export dashboard.
 * Self-contained (icons inline) — the shared AdminStatIcon registry
 * (content/admin.ts) only has users/clock/message/clipboard, none of which
 * match booking-status semantics, so this avoids stretching that registry.
 */

type IconProps = { className?: string };

function TotalIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  );
}

function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.5 2.4 2.4 4.6-5.4" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function XCircleIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

function DoubleCheckIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m2.5 12.5 3 3 5-5.5M8.5 15.5l1 1 8-9" />
    </svg>
  );
}

function AlertIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 4.5 3 19.5h18L12 4.5Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export type BookingExportStatTone =
  | "total"
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "noShow";

const TONE_STYLES: Record<
  BookingExportStatTone,
  { icon: (props: IconProps) => React.ReactNode; badge: string; accent: string }
> = {
  total: {
    icon: TotalIcon,
    badge: "bg-primary/10 text-primary",
    accent: "before:bg-primary",
  },
  confirmed: {
    icon: CheckCircleIcon,
    badge: "bg-success/10 text-success",
    accent: "before:bg-success",
  },
  pending: {
    icon: ClockIcon,
    badge: "bg-amber-500/10 text-amber-600",
    accent: "before:bg-amber-500",
  },
  cancelled: {
    icon: XCircleIcon,
    badge: "bg-danger/10 text-danger",
    accent: "before:bg-danger",
  },
  completed: {
    icon: DoubleCheckIcon,
    badge: "bg-sky-500/10 text-sky-600",
    accent: "before:bg-sky-500",
  },
  noShow: {
    icon: AlertIcon,
    badge: "bg-slate-500/10 text-slate-600",
    accent: "before:bg-slate-500",
  },
};

export function BookingExportStatCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  tone: BookingExportStatTone;
}) {
  const style = TONE_STYLES[tone];
  const Icon = style.icon;
  return (
    <article
      className={`admin-card relative overflow-hidden p-4 before:absolute before:inset-y-0 before:start-0 before:w-1 ${style.accent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style.badge}`}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-primary">{value}</p>
      <p className="mt-1.5 text-xs text-muted">{subtitle}</p>
    </article>
  );
}
