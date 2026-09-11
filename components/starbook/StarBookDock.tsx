"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { starBookHref } from "@/lib/starbook/paths";

const ITEMS = [
  { href: starBookHref("/"), label: "خانه", icon: "✦", home: true },
  { href: starBookHref("/browse"), label: "کشف", icon: "⌕" },
  { href: starBookHref("/campaigns/flash-konkur"), label: "حراج", icon: "⚡" },
  { href: starBookHref("/wishlist"), label: "قلب", icon: "♡" },
  { href: starBookHref("/account"), label: "من", icon: "◎" },
] as const;

export function StarBookDock({ activePath }: { activePath: string }) {
  const reduce = useReducedMotion();
  const homeHref = starBookHref("/");

  return (
    <nav className="starbook-dock" aria-label="میانبر انگشت">
      {ITEMS.map((item) => {
        const active =
          "home" in item && item.home
            ? activePath === homeHref
            : activePath.startsWith(item.href);
        return (
          <motion.div key={item.href} whileTap={reduce ? undefined : { scale: 0.92 }}>
            <Link href={item.href} data-active={active}>
              <span className="starbook-dock-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
