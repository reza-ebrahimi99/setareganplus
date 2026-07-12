import {
  BookIcon,
  ChartIcon,
  ClipboardIcon,
  MessageIcon,
  UsersIcon,
} from "@/components/icons";
import type { AdminNavIcon, AdminStatIcon } from "@/content/admin";

type IconProps = {
  className?: string;
};

function OverviewIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

function FinanceIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  );
}

function ExamIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M7 4h10l2 3v13H5V4h2Z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2 2 5-4" />
    </svg>
  );
}

function PendingCircleIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4" />
    </svg>
  );
}

function PlannedCircleIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v1M12 16v1" />
    </svg>
  );
}

const navIconMap: Record<AdminNavIcon, React.ComponentType<IconProps>> = {
  overview: OverviewIcon,
  leads: UsersIcon,
  enrollments: ClipboardIcon,
  students: UsersIcon,
  courses: BookIcon,
  exams: ExamIcon,
  finance: FinanceIcon,
  reports: ChartIcon,
  settings: SettingsIcon,
};

const statIconMap: Record<AdminStatIcon, React.ComponentType<IconProps>> = {
  users: UsersIcon,
  clock: ClockIcon,
  message: MessageIcon,
  clipboard: ClipboardIcon,
};

export function AdminNavIconComponent({
  name,
  className = "size-5 shrink-0",
}: {
  name: AdminNavIcon;
  className?: string;
}) {
  const Icon = navIconMap[name];
  return <Icon className={className} />;
}

export function AdminStatIconComponent({
  name,
  className = "size-5",
}: {
  name: AdminStatIcon;
  className?: string;
}) {
  const Icon = statIconMap[name];
  return <Icon className={className} />;
}

export function ReadinessStatusIcon({
  tone,
  className = "size-4 shrink-0",
}: {
  tone: "ready" | "pending" | "planned";
  className?: string;
}) {
  if (tone === "ready") {
    return <CheckCircleIcon className={className} />;
  }

  if (tone === "pending") {
    return <PendingCircleIcon className={className} />;
  }

  return <PlannedCircleIcon className={className} />;
}
