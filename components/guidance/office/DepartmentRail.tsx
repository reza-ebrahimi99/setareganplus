import Link from "next/link";
import type { OfficeRailSection } from "@/lib/guidance/office/nav";
import { MAJOR_OFFICE_HOME } from "@/lib/guidance/office/nav";

function isRailActive(pathname: string, href: string): boolean {
  if (href === MAJOR_OFFICE_HOME) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DepartmentRail({
  pathname,
  sections,
}: {
  pathname: string;
  sections: readonly OfficeRailSection[];
}) {
  return (
    <aside className="chamber-nav" aria-label="اتاق‌های دفتر مشاوره">
      <p className="chamber-nav__mark">SETAREGAN</p>
      <p className="chamber-nav__name">دفتر انتخاب رشته</p>
      <p className="chamber-nav__who">نظارت مهندس رضا ابراهیمی</p>
      {sections.map((section) => (
        <div key={section.id}>
          <p className="chamber-nav__chapter">{section.label}</p>
          <ul>
            {section.items.map((item) => {
              if (!item.live || !item.href) {
                return (
                  <li key={item.id}>
                    <span className="is-locked">
                      {item.label}
                      {item.lockReason ? <em>{item.lockReason}</em> : null}
                    </span>
                  </li>
                );
              }
              const active = isRailActive(pathname, item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={active ? "is-active" : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
