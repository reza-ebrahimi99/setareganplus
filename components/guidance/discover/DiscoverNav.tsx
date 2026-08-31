import Link from "next/link";

const ITEMS = [
  { href: "/discover", label: "خانه دانشنامه" },
  { href: "/discover/systems", label: "نظام دانشگاهی" },
  { href: "/discover/majors", label: "رشته‌ها" },
  { href: "/discover/pathways", label: "مقاطع" },
  { href: "/discover/compare", label: "مقایسه" },
  { href: "/discover/search", label: "جستجو" },
] as const;

export function DiscoverNav({ activePath }: { activePath: string }) {
  return (
    <nav className="discover-nav" aria-label="بخش‌های کانون کشف">
      {ITEMS.map((item) => {
        const active =
          item.href === "/discover"
            ? activePath === "/discover"
            : activePath === item.href || activePath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
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
