import Link from "next/link";

type CtaAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
};

type CtaPanelProps = {
  heading: string;
  description: string;
  primary: CtaAction;
  secondary?: CtaAction;
};

const baseStyles =
  "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

function getPanelButtonClassName(variant: CtaAction["variant"] = "primary") {
  if (variant === "secondary") {
    return `${baseStyles} bg-secondary text-primary shadow-sm hover:bg-secondary/90`;
  }

  if (variant === "outline") {
    return `${baseStyles} border border-white/25 bg-white/5 text-white hover:bg-white/10`;
  }

  return `${baseStyles} bg-white text-primary hover:bg-white/90`;
}

export function CtaPanel({
  heading,
  description,
  primary,
  secondary,
}: CtaPanelProps) {
  return (
    <div className="cta-panel rounded-2xl border border-primary/20 p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold sm:text-3xl">{heading}</h2>
      <p className="mt-3 max-w-2xl text-base leading-8">{description}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={primary.href}
          className={getPanelButtonClassName(primary.variant ?? "secondary")}
        >
          {primary.label}
        </Link>
        {secondary ? (
          <Link
            href={secondary.href}
            className={getPanelButtonClassName(secondary.variant ?? "outline")}
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
