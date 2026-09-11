import type { ReactNode } from "react";

export function StarBookCheckoutChrome({
  children,
  title = "تسویه سریع",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="starbook-panel max-w-xl">
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <div className="starbook-steps" aria-hidden>
        <span data-on="true" />
        <span data-on="true" />
        <span />
      </div>
      <p className="mb-4 text-xs text-[var(--sb-muted)]">۱ اطلاعات · ۲ درگاه · ۳ رسید و QR</p>
      {children}
    </div>
  );
}
