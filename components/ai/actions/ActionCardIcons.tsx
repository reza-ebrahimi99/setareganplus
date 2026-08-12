"use client";

import type { ReactNode } from "react";
import type { ActionCardIcon } from "@/types/action-card";

type IconProps = { className?: string };

function RegisterIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M8.5 3.5h3l1.2 3.2-1.8 1.8a12 12 0 0 0 5.6 5.6l1.8-1.8 3.2 1.2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3.5 7.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}

function LocationIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function GraduationIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M2.5 9.5 12 4l9.5 5.5L12 15 2.5 9.5Z" />
      <path d="M6.5 12v4.5c0 .8 2.5 2.5 5.5 2.5s5.5-1.7 5.5-2.5V12" />
      <path d="M21.5 9.5V15" />
    </svg>
  );
}

function TrophyIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5.5a2 2 0 0 0 0 4H8M16 5h2.5a2 2 0 0 1 0 4H16" />
      <path d="M10 14h4v2.5l-2 3.5-2-3.5V14Z" />
      <path d="M8 21h8" />
    </svg>
  );
}

function GalleryIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m7 16 3.5-3.5L14 16l2-2 3 3" />
    </svg>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
      <path d="M6.5 3A2.5 2.5 0 0 0 4 5.5V19" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </svg>
  );
}

function RobotIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 8V5M9 13h.01M15 13h.01M9 17h6" />
      <circle cx="12" cy="4" r="1" />
    </svg>
  );
}

function ChatIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  );
}

function CameraIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function SparkIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

const ICON_MAP: Record<ActionCardIcon, (props: IconProps) => ReactNode> = {
  register: RegisterIcon,
  phone: PhoneIcon,
  location: LocationIcon,
  graduation: GraduationIcon,
  trophy: TrophyIcon,
  gallery: GalleryIcon,
  book: BookIcon,
  calendar: CalendarIcon,
  robot: RobotIcon,
  chat: ChatIcon,
  camera: CameraIcon,
  spark: SparkIcon,
};

export function ActionCardIconView({
  name,
  className = "size-5",
}: {
  name: ActionCardIcon;
  className?: string;
}) {
  const Icon = ICON_MAP[name];
  return <Icon className={className} />;
}
