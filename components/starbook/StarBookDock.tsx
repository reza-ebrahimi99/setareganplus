"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const ITEMS = [
  { href: "/shop", label: "خانه", icon: "✦" },
  { href: "/shop/browse", label: "کشف", icon: "⌕" },
  { href: "/shop/campaigns/flash-konkur", label: "حراج", icon: "⚡" },
  { href: "/shop/wishlist", label: "قلب", icon: "♡" },
  { href: "/shop/account", label: "من", icon: "◎" },
] as const;

export function StarBookDock({ activePath }: { activePath: string }) {
  const reduce = useReducedMotion();

  return (
    <nav className="starbook-dock" aria-label="میانبر انگشت">
      {ITEMS.map((item) => {
        const active =
          item.href === "/shop" ? activePath === "/shop" : activePath.startsWith(item.href);
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
