"use client";

import Link from "next/link";
import { useState } from "react";
import { StarBookCommand } from "@/components/starbook/StarBookCommand";
import { StarBookDock } from "@/components/starbook/StarBookDock";
import { StarBookFloatCart } from "@/components/starbook/StarBookFloatCart";
import { StarBookHeaderActions } from "@/components/starbook/StarBookHeaderActions";
import { useStarBookCatalog } from "@/components/starbook/StarBookCatalogContext";

const NAV = [
  { href: "/shop", label: "خانه" },
  { href: "/shop/browse", label: "کشف کتاب" },
  { href: "/shop/collections", label: "کالکشن‌ها" },
  { href: "/shop/bundles", label: "بسته‌ها" },
  { href: "/shop/campaigns/flash-konkur", label: "حراج" },
  { href: "/shop/account", label: "پروفایل من" },
] as const;

type StarBookShellProps = {
  children: React.ReactNode;
  activePath?: string;
};

export function StarBookShell({ children, activePath = "/shop" }: StarBookShellProps) {
  const catalog = useStarBookCatalog();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="starbook">
      <div className="starbook-shell">
        <header className="starbook-header">
          <Link href="/shop" className="starbook-brand">
            <span className="starbook-mark" aria-hidden>
              ✦
            </span>
            <span>
              استاربوک
              <span className="mt-0.5 block text-[11px] font-medium text-[var(--sb-muted)]">
                کتاب‌فروشی ستارگان
              </span>
            </span>
          </Link>
          <nav className="starbook-nav" aria-label="استاربوک">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={
                  item.href === "/shop"
                    ? activePath === "/shop"
                    : activePath.startsWith(item.href)
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <StarBookHeaderActions onSearch={() => setSearchOpen(true)} />
        </header>
        <main className="starbook-main">{children}</main>
        <footer className="starbook-footer">
          <p>استاربوک · فروشگاه آموزشی ستارگان پلاس · تحویل حضوری در شعبه</p>
          <p className="mt-2">
            <Link href="/">بازگشت به سایت ستارگان</Link>
            {" · "}
            <Link href="/shop/track">پیگیری سفارش</Link>
          </p>
        </footer>
        <StarBookDock activePath={activePath} />
        <StarBookFloatCart />
        <StarBookCommand
          products={catalog.products}
          grades={catalog.grades}
          subjects={catalog.subjects}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      </div>
    </div>
  );
}
