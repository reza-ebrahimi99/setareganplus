"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { fa } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/classes", label: "دوره‌ها" },
  { href: "/classes/leaderboard", label: "برترین‌های هفته" },
  { href: "/classes/me", label: "دوره‌های من" },
];

export function TopBar({ student }: { student: { firstName: string; points: number } | null }) {
  const path = usePathname() || "/classes";
  return (
    <div className="container-x flex flex-wrap items-center gap-3 py-4">
      <nav className="cl-nav" aria-label="کلاس‌های ویدیویی">
        {LINKS.map((l) => {
          const on = l.href === "/classes" ? path === "/classes" : path === l.href || path.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mr-auto flex items-center gap-2">
        {student && <span className="cl-chip">{student.firstName} · {fa(student.points)} امتیاز</span>}
        <ThemeToggle />
      </div>
    </div>
  );
}
