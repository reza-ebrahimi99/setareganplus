import Link from "next/link";
import type { OfficeRailSection } from "@/lib/guidance/office/nav";
import { MAJOR_OFFICE_HOME } from "@/lib/guidance/office/nav";

function isRailActive(pathname: string, href: string): boolean {
  if (href === MAJOR_OFFICE_HOME) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OfficeMobileNav({
  pathname,
  sections,
}: {
  pathname: string;
  sections: readonly OfficeRailSection[];
}) {
  const items = sections.flatMap((section) => section.items);

  return (
    <nav className="major-office__mobile-rooms" aria-label="اتاق‌های دپارتمان">
      {items.map((item) => {
        if (!item.live || !item.href) {
          return (
            <span
              key={item.id}
              className="major-office__chip is-locked"
              title={item.lockReason ?? item.label}
            >
              <strong>{item.label}</strong>
              {item.lockReason ? <em>{item.lockReason}</em> : null}
            </span>
          );
        }
        const active = isRailActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`major-office__chip${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
