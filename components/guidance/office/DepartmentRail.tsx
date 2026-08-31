import Link from "next/link";
import type { OfficeRailSection } from "@/lib/guidance/office/nav";
import { MAJOR_OFFICE_HOME, MAJOR_OFFICE_JOURNEY } from "@/lib/guidance/office/nav";

function isActive(pathname: string, href: string): boolean {
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
  const live = sections
    .flatMap((section) => section.items)
    .filter((item) => item.live && item.href);
  const current = live
    .filter((item) => isActive(pathname, item.href!))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];
  const isHome =
    pathname === MAJOR_OFFICE_HOME || pathname === `${MAJOR_OFFICE_HOME}/`;

  return (
    <nav className="chamber-folio" aria-label="فصل جاری">
      <p>{isHome ? "آغاز دفتر" : `فصل · ${current?.label ?? "دفتر"}`}</p>
      <div>
        {isHome ? null : <Link href={MAJOR_OFFICE_HOME}>دفتر</Link>}
        <Link href={MAJOR_OFFICE_JOURNEY}>فهرست</Link>
      </div>
    </nav>
  );
}
