type IconProps = {
  className?: string;
};

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 4.75h2.1l1.1 2.75-1.35 1.1a12.5 12.5 0 0 0 5.05 5.05l1.1-1.35 2.75 1.1v2.1c0 .7-.45 1.35-1.15 1.5A15.75 15.75 0 0 1 4.75 7.9c.15-.7.8-1.15 1.5-1.15Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TelegramIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.7 5.1 3.9 11.2c-1.1.4-1.1 1.1-.2 1.4l3.9 1.2 1.5 4.6c.2.6.1.8.7.8.4 0 .6-.2.8-.4l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8L20.9 6.3c.3-1.2-.4-1.7-1.2-1.2Zm-3.3 3.2-6.9 6.2-.3 3-1.4-4.4 8.6-4.8Z" />
    </svg>
  );
}

export function BaleMark({ className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={
        className
          ? `flex items-center justify-center font-bold leading-none ${className}`
          : "flex items-center justify-center font-bold leading-none"
      }
    >
      ب
    </span>
  );
}

const socialButtonClassName =
  "inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-sm transition-colors hover:border-secondary/50 hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const socialButtonOnDarkClassName =
  "inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:border-secondary hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

type SocialItem = {
  platform: string;
  href: string;
  label: string;
};

function socialAriaLabel(platform: string) {
  if (platform.includes("اینستاگرام")) return "اینستاگرام مجموعه";
  if (platform.includes("تلگرام")) return "کانال تلگرام مجموعه";
  if (platform.includes("بله")) return "کانال بله مجموعه";
  return platform;
}

function SocialGlyph({ platform }: { platform: string }) {
  if (platform.includes("اینستاگرام")) {
    return <InstagramIcon className="size-4" />;
  }
  if (platform.includes("تلگرام")) {
    return <TelegramIcon className="size-4" />;
  }
  if (platform.includes("بله")) {
    return <BaleMark className="text-sm" />;
  }
  return <span className="text-xs font-semibold">{platform.slice(0, 1)}</span>;
}

type SocialIconLinksProps = {
  items: readonly SocialItem[];
  tone?: "light" | "dark";
  className?: string;
};

export function SocialIconLinks({
  items,
  tone = "light",
  className,
}: SocialIconLinksProps) {
  const buttonClass =
    tone === "dark" ? socialButtonOnDarkClassName : socialButtonClassName;

  return (
    <ul className={className ?? "flex flex-wrap items-center gap-2.5"}>
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={socialAriaLabel(item.platform)}
            title={item.platform}
            className={buttonClass}
          >
            <SocialGlyph platform={item.platform} />
          </a>
        </li>
      ))}
    </ul>
  );
}

type PhoneIconLinksProps = {
  phones: readonly { value: string; href: string }[];
  formatValue: (value: string) => string;
};

export function PhoneIconLinks({ phones, formatValue }: PhoneIconLinksProps) {
  return (
    <ul className="mt-4 space-y-2.5">
      {phones.map((phone) => {
        const display = formatValue(phone.value);
        return (
          <li key={phone.href}>
            <a
              href={phone.href}
              aria-label={`تماس با شماره ${display}`}
              className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 text-primary shadow-sm transition-colors hover:border-secondary/45 hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors group-hover:border-secondary/40 group-hover:text-secondary">
                <PhoneIcon className="size-3.5" />
              </span>
              <span className="text-base font-medium" dir="ltr">
                {display}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
