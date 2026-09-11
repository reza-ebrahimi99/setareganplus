"use client";

import Link from "next/link";
import { useState } from "react";
import { StarBookCommand } from "@/components/starbook/StarBookCommand";
import { StarBookDock } from "@/components/starbook/StarBookDock";
import { StarBookFloatCart } from "@/components/starbook/StarBookFloatCart";
import { StarBookHeaderActions } from "@/components/starbook/StarBookHeaderActions";
import { useStarBookCatalog } from "@/components/starbook/StarBookCatalogContext";
import { PUBLIC_SITE_ORIGIN } from "@/lib/registration/flows/public-url";
import { getStarBookPublicOrigin } from "@/lib/starbook/host";
import { starBookHref } from "@/lib/starbook/paths";

const NAV = [
  { href: starBookHref("/"), label: "خانه", home: true },
  { href: starBookHref("/browse"), label: "کشف کتاب" },
  { href: starBookHref("/collections"), label: "کالکشن‌ها" },
  { href: starBookHref("/bundles"), label: "بسته‌ها" },
  { href: starBookHref("/campaigns/flash-konkur"), label: "حراج" },
  { href: starBookHref("/account"), label: "پروفایل من" },
] as const;

type StarBookShellProps = {
  children: React.ReactNode;
  activePath?: string;
};

export function StarBookShell({
  children,
  activePath = starBookHref("/"),
}: StarBookShellProps) {
  const catalog = useStarBookCatalog();
  const [searchOpen, setSearchOpen] = useState(false);
  const homeHref = starBookHref("/");

  return (
    <div className="starbook">
      <div className="starbook-shell">
        <header className="starbook-header">
          <Link href={homeHref} className="starbook-brand">
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
                  "home" in item && item.home
                    ? activePath === homeHref
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
            <a href={PUBLIC_SITE_ORIGIN}>بازگشت به سایت ستارگان</a>
            {" · "}
            <Link href={starBookHref("/track")}>پیگیری سفارش</Link>
            {" · "}
            <a href={`${PUBLIC_SITE_ORIGIN}/shop`}>فروشگاه جزوه</a>
            {" · "}
            <a href={getStarBookPublicOrigin()}>استاربوک</a>
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
