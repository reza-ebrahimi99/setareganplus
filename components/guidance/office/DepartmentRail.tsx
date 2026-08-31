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
    <aside className="major-office__rail" aria-label="اتاق‌های دپارتمان">
      <p className="major-office__rail-brand">دپارتمان انتخاب رشته</p>
      <p className="major-office__rail-sub">قلم‌چی نسیم‌شهر</p>
      {sections.map((section) => (
        <div key={section.id} className="major-office__rail-section">
          <p className="major-office__rail-label">{section.label}</p>
          <ul>
            {section.items.map((item) => {
              if (!item.live || !item.href) {
                return (
                  <li key={item.id}>
                    <span className="major-office__rail-link is-locked">
                      <span className="major-office__rail-link-copy">
                        <strong>{item.label}</strong>
                        {item.lockReason ? <em>{item.lockReason}</em> : null}
                      </span>
                    </span>
                  </li>
                );
              }
              const active = isRailActive(pathname, item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`major-office__rail-link${active ? " is-active" : ""}`}
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
