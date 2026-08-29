import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";
import type { PortalHomeModuleCard } from "@/lib/portal/student/home-presentation";

type PortalModulesWidgetProps = {
  modules: readonly PortalHomeModuleCard[];
};

/** Student applications — app-like module cards, never plain links. */
export function PortalModulesWidget({ modules }: PortalModulesWidgetProps) {
  return (
    <section className="portal-modules" aria-label="اپلیکیشن‌های من">
      <div className="portal-modules__header">
        <h2 className="portal-section-title">اپ‌های من</h2>
        <p className="portal-section-support">
          هر ماژول یک اپ رنگی با وضعیت زنده است.
        </p>
      </div>
      <ul className="portal-modules__grid">
        {modules.map((mod) => (
          <li key={mod.id}>
            <Link
              href={mod.href}
              className="portal-module-card"
              data-portal-accent={mod.accent}
            >
              <span className="portal-module-card__icon" aria-hidden="true">
                <PortalIcon name={mod.icon} className="size-7" />
              </span>
              <span className="portal-module-card__status">
                {toPersianDigits(mod.status)}
              </span>
              <span className="portal-module-card__title">{mod.title}</span>
              <span className="portal-module-card__desc">{mod.description}</span>
              <span className="portal-module-card__cta">{mod.ctaLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
