import { toPersianDigits } from "@/lib/persian";

type EyebrowProps = {
  children: React.ReactNode;
  className?: string;
};

export function Eyebrow({ children, className }: EyebrowProps) {
  const content =
    typeof children === "string" || typeof children === "number"
      ? toPersianDigits(children)
      : children;

  if (className) {
    return (
      <p
        className={`mb-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide ${className}`}
      >
        {content}
      </p>
    );
  }

  return (
    <p className="mb-4 inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tracking-wide text-muted shadow-sm">
      {content}
    </p>
  );
}
