"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type AtrinCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function AtrinCard({
  children,
  className = "",
  hover = true,
}: AtrinCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={hover && !reduce ? { y: -2 } : undefined}
      className={`atrin-glass rounded-[1.15rem] p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function AtrinBadge({
  children,
  color = "#7c3aed",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold"
      style={{
        color,
        background: `${color}22`,
        boxShadow: `0 0 14px ${color}33`,
      }}
    >
      {children}
    </span>
  );
}

export function AtrinMetric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="atrin-glass rounded-2xl p-4 text-center">
      <p className="text-2xl font-extrabold text-[#c4b5fd]">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

export function AtrinTip({
  children,
  accent = "#7c3aed",
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <p
      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[0.75rem] leading-6 text-slate-300"
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      {children}
    </p>
  );
}

export function AtrinExpandable({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="atrin-glass group rounded-[1.05rem] px-3 py-2"
    >
      <summary className="cursor-pointer list-none py-1 text-sm font-semibold text-white marker:content-none">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-slate-400 transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="mt-2 border-t border-white/10 pt-2 text-sm leading-7 text-slate-300">
        {children}
      </div>
    </details>
  );
}

export function AtrinTimeline({
  items,
}: {
  items: readonly { title: string; body?: string; year?: string }[];
}) {
  return (
    <ol className="space-y-3 border-s border-white/15 ps-4">
      {items.map((item) => (
        <li key={`${item.year ?? ""}-${item.title}`} className="relative">
          <span className="absolute -start-[1.28rem] top-1.5 size-2.5 rounded-full bg-[#7c3aed] shadow-[0_0_10px_#7c3aed]" />
          {item.year ? (
            <p className="text-[0.65rem] font-semibold text-cyan-300">
              {item.year}
            </p>
          ) : null}
          <p className="text-sm font-bold text-white">{item.title}</p>
          {item.body ? (
            <p className="mt-0.5 text-xs leading-6 text-slate-400">{item.body}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function AtrinPromptChip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="atrin-chip disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
