"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

type StarBookEmptyProps = {
  title: string;
  body: string;
  href?: string;
  action?: string;
};

export function StarBookEmpty({
  title,
  body,
  href = "/browse",
  action = "کشف کتاب‌ها",
}: StarBookEmptyProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="starbook-empty"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="starbook-empty-art" aria-hidden>
        <span className="starbook-book" style={{ position: "relative", inset: "auto", margin: "0 auto" }} />
      </div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-[var(--sb-muted)]">{body}</p>
      <Link href={href} className="starbook-btn starbook-btn-primary starbook-btn-breathe mt-6">
        {action}
      </Link>
    </motion.div>
  );
}
