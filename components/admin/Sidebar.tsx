"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "داشبورد", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/admin/submissions", label: "درخواست‌ها", icon: "M4 4h16v12H5.5L4 17.5zM8 9h8M8 12h5" },
  { href: "/admin/forms", label: "فرم‌ساز", icon: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" },
  { sep: "فروشگاه جزوه" },
  { href: "/admin/shop", label: "داشبورد فروش", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/admin/shop/orders", label: "سفارش‌ها", icon: "M6 2l-2 4v14a2 2 0 002 2h12a2 2 0 002-2V6l-2-4zM4 6h16M16 10a4 4 0 01-8 0" },
  { href: "/admin/shop/pickup", label: "تحویل حضوری", icon: "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" },
  { href: "/admin/shop/products", label: "جزوه‌ها", icon: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5" },
  { href: "/admin/shop/settings", label: "تنظیمات فروشگاه", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 13H3a2 2 0 110-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 3V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0021 9h0a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 2z" },
  { sep: "محتوا" },
  { href: "/admin/centers", label: "مراکز", icon: "M12 2l3 7h7l-5.5 4.5 2 7.5L12 16.5 5.5 21l2-7.5L2 9h7z" },
  { href: "/admin/team", label: "تیم", icon: "M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0" },
  { href: "/admin/achievements", label: "افتخارات", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" },
  { href: "/admin/gallery", label: "گالری", icon: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" },
  { href: "/admin/faq", label: "سؤالات متداول", icon: "M9 9a3 3 0 115 2c-1 1-2 1.5-2 3M12 18h.01" },
  { href: "/admin/settings", label: "تنظیمات سایت", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2" },
] as const;

export function Sidebar({ newCount, todoCount = 0, logout }: { newCount: number; todoCount?: number; logout: () => Promise<void> }) {
  const path = usePathname();
  // Longest matching href wins, so /admin/shop/orders does not also light up /admin/shop.
  const active = NAV.filter((n): n is Extract<(typeof NAV)[number], { href: string }> => "href" in n && (n.href === "/admin" ? path === "/admin" : path === n.href || path.startsWith(n.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <aside className="flex flex-col bg-navy text-white/80 lg:fixed lg:inset-y-0 lg:right-0 lg:w-64">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white"><Image src="/brand/logo.png" alt="" width={30} height={25} /></span>
        <div className="leading-tight">
          <p className="font-extrabold text-white">ستارگان پلاس</p>
          <p className="text-xs text-white/50">پنل مدیریت</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
        {NAV.map((n, i) =>
          "sep" in n ? (
            <p key={i} className="mt-4 mb-1 hidden px-3 text-xs font-semibold text-white/35 lg:block">{n.sep}</p>
          ) : (
            <Link
              key={n.href}
              href={n.href}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                n.href === active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
              {n.label}
              {n.href === "/admin/shop/orders" && todoCount > 0 && <span className="mr-auto rounded-full bg-gold px-2 text-xs font-bold text-navy">{todoCount.toLocaleString("fa-IR")}</span>}
              {n.href === "/admin/submissions" && newCount > 0 && <span className="mr-auto rounded-full bg-gold px-2 text-xs font-bold text-navy">{newCount.toLocaleString("fa-IR")}</span>}
            </Link>
          ),
        )}
      </nav>
      <div className="hidden border-t border-white/10 p-3 lg:block">
        <Link href="/" target="_blank" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5">مشاهده سایت ↗</Link>
        <form action={logout}><button className="w-full rounded-xl px-3 py-2 text-right text-sm hover:bg-white/5">خروج</button></form>
      </div>
    </aside>
  );
}
