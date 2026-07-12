import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary/92 focus-visible:outline-primary",
  secondary:
    "bg-secondary text-primary shadow-sm hover:bg-secondary/90 focus-visible:outline-secondary",
  outline:
    "border border-border bg-surface text-foreground hover:border-secondary/40 hover:bg-background focus-visible:outline-secondary",
};

export function Button({
  href,
  children,
  variant = "primary",
  className,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <Link
      href={href}
      className={
        className
          ? `${baseStyles} ${variantStyles[variant]} ${className}`
          : `${baseStyles} ${variantStyles[variant]}`
      }
    >
      {children}
    </Link>
  );
}
