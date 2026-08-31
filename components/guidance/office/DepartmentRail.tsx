import Link from "next/link";
import { OFFICE_RAIL_SECTIONS } from "@/lib/guidance/office/nav";

export function DepartmentRail({ pathname }: { pathname: string }) {
  return (
    <aside className="major-office__rail" aria-label="اتاق‌های دپارتمان">
      <p className="major-office__rail-brand">دپارتمان انتخاب رشته</p>
      <p className="major-office__rail-sub">قلم‌چی نسیم‌شهر</p>
      {OFFICE_RAIL_SECTIONS.map((section) => (
        <div key={section.id} className="major-office__rail-section">
          <p className="major-office__rail-label">{section.label}</p>
          <ul>
            {section.items.map((item) => {
              const active = Boolean(item.href && pathname === item.href);
              if (!item.live || !item.href) {
                return (
                  <li key={item.id}>
                    <span className="major-office__rail-link is-soon">
                      {item.label}
                      <em>به‌زودی</em>
                    </span>
                  </li>
                );
              }
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
