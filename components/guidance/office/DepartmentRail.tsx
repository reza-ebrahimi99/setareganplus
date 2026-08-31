import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icons";
import type { OfficeRailSection } from "@/lib/guidance/office/nav";
import { MAJOR_OFFICE_HOME } from "@/lib/guidance/office/nav";

function isRailActive(pathname: string, href: string): boolean {
  if (href === MAJOR_OFFICE_HOME) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ITEM_ICON: Record<string, PortalIconName> = {
  home: "home",
  journey: "route",
  session: "calendar",
  profile: "user",
  academic: "book",
  grades: "chart",
  transcript: "clipboard",
  documents: "clipboard",
  interest: "spark",
  universities: "layers",
  majors: "book",
  systems: "grid",
};

export function DepartmentRail({
  pathname,
  sections,
}: {
  pathname: string;
  sections: readonly OfficeRailSection[];
}) {
  return (
    <aside className="atelier-rail" aria-label="اتاق‌های دفتر مشاوره">
      <p className="atelier-rail__mark">SETAREGAN</p>
      <p className="atelier-rail__brand">دفتر انتخاب رشته</p>
      <p className="atelier-rail__sub">نظارت مهندس رضا ابراهیمی</p>
      {sections.map((section) => (
        <div key={section.id}>
          <p className="atelier-rail__label">{section.label}</p>
          <ul>
            {section.items.map((item) => {
              const icon = ITEM_ICON[item.id] ?? "route";
              if (!item.live || !item.href) {
                return (
                  <li key={item.id}>
                    <span className="atelier-rail__link is-locked">
                      <PortalIcon name={icon} />
                      <span>
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
                    className={`atelier-rail__link${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <PortalIcon name={icon} />
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
