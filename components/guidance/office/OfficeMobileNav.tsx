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
  const items = sections.flatMap((section) => section.items).filter((item) => item.live && item.href);

  return (
    <nav className="chamber-rooms" aria-label="اتاق‌های دفتر مشاوره">
      {items.map((item) => {
        const active = isRailActive(pathname, item.href!);
        return (
          <Link
            key={item.id}
            href={item.href!}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
