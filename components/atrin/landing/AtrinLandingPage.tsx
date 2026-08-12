"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AtrinMark } from "@/components/atrin/AtrinMark";
import {
  AtrinCard,
  AtrinExpandable,
  AtrinMetric,
  AtrinTimeline,
} from "@/components/atrin/ui";
import {
  ATRIN_BRAND,
  ATRIN_LANDING,
  ATRIN_LANDING_EXTRA,
  ATRIN_MODES,
  ATRIN_PROMPT_GROUPS,
  ATRIN_TRUST_STATS,
  ATRIN_TRUST_TIMELINE,
} from "@/content/atrin";
import { toPersianDigits } from "@/lib/persian";

const AtrinEmbeddedChat = dynamic(
  () =>
    import("@/components/atrin/AtrinEmbeddedChat").then(
      (mod) => mod.AtrinEmbeddedChat,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="atrin-glass flex h-[min(72vh,640px)] items-center justify-center rounded-[1.5rem] text-sm text-slate-400">
        در حال آماده‌سازی آترین…
      </div>
    ),
  },
);

function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function AtrinLandingPage() {
  const reduce = useReducedMotion();
  const modes = Object.values(ATRIN_MODES);

  return (
    <div className="atrin-root atrin-space-bg min-h-screen text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b1a]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/atrin" className="inline-flex items-center gap-2">
            <AtrinMark size="sm" />
            <span>
              <span className="block text-sm font-bold">
                {ATRIN_BRAND.product}
              </span>
              <span className="block text-[0.65rem] text-slate-400">
                {ATRIN_BRAND.subtitle}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="#atrin-chat"
              className="hidden rounded-xl bg-gradient-to-l from-[#7c3aed] to-[#06b6d4] px-3 py-2 text-xs font-bold text-white sm:inline-flex"
            >
              گفتگو
            </a>
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
            >
              بازگشت به سایت
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-20 pb-24 pt-10 sm:pt-16">
        <Section>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#c4b5fd]">
                {ATRIN_LANDING.heroEyebrow}
              </p>
              <h1 className="atrin-gradient-text mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
                {ATRIN_LANDING.heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">
                {ATRIN_LANDING.heroBody}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#atrin-chat"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-[#7c3aed] to-[#06b6d4] px-5 text-sm font-bold text-white shadow-[0_0_28px_rgb(124_58_237_/_0.4)]"
                >
                  شروع گفتگو با آترین
                </a>
                <a
                  href="#atrin-capabilities"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold"
                >
                  قابلیت‌ها
                </a>
              </div>
            </div>
            <div
              aria-hidden
              className="atrin-glass relative mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-[2rem]"
            >
              <div className="absolute inset-8 rounded-[1.5rem] bg-gradient-to-br from-[#7c3aed]/30 via-transparent to-[#22d3ee]/25 blur-xl" />
              <AtrinMark size="lg" />
            </div>
          </motion.div>
        </Section>

        <Section id="atrin-capabilities">
          <h2 className="text-2xl font-bold">آترین چه می‌کند؟</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ATRIN_LANDING.capabilities.map((item, index) => (
              <motion.article
                key={item.title}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.04 }}
              >
                <AtrinCard className="h-full">
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {item.body}
                  </p>
                </AtrinCard>
              </motion.article>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">چطور کار می‌کند؟</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ATRIN_LANDING_EXTRA.howItWorks.map((step, index) => (
              <AtrinCard key={step.title} hover={false}>
                <p className="text-xs font-bold text-cyan-300">
                  {toPersianDigits(String(index + 1))}
                </p>
                <h3 className="mt-2 text-base font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {step.body}
                </p>
              </AtrinCard>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">حالت‌های گفتگو</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {modes.map((mode) => (
              <div
                key={mode.id}
                className="atrin-glass rounded-2xl p-3"
                style={{ boxShadow: `inset 0 0 0 1px ${mode.accent}44` }}
              >
                <p className="text-sm font-bold" style={{ color: mode.accent }}>
                  {mode.label}
                </p>
                <p className="mt-1 text-[0.7rem] leading-6 text-slate-400">
                  {mode.tip}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">اعتماد مؤسسه</h2>
          <p className="mt-2 text-sm text-slate-400">
            آمار تأییدشده از لایه محتوای درباره ما — بدون تکرار دستی.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ATRIN_TRUST_STATS.map((stat) => (
              <AtrinMetric
                key={stat.label}
                value={toPersianDigits(String(stat.value))}
                label={stat.label}
              />
            ))}
          </div>
          <div className="mt-8 atrin-glass rounded-[1.25rem] p-5">
            <h3 className="text-lg font-bold">خط زمان اکوسیستم</h3>
            <div className="mt-4">
              <AtrinTimeline
                items={ATRIN_TRUST_TIMELINE.map((item) => ({
                  year: item.year,
                  title: item.title,
                  body: item.description,
                }))}
              />
            </div>
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">آمار تجربه آترین</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ATRIN_LANDING.stats.map((stat) => (
              <AtrinMetric key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">نمونه‌های گفتگو</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ATRIN_LANDING.examples.map((example) => (
              <AtrinCard key={example.q} hover={false}>
                <p className="text-sm font-semibold text-cyan-200">
                  کاربر: {example.q}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  آترین: {example.a}
                </p>
              </AtrinCard>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">پرامپت‌های محبوب</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {ATRIN_PROMPT_GROUPS.map((group) => (
              <AtrinCard key={group.id} hover={false}>
                <p className="text-sm font-bold text-[#c4b5fd]">{group.label}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {group.prompts.map((prompt) => (
                    <li key={prompt}>
                      <a href="#atrin-chat" className="atrin-chip">
                        {prompt}
                      </a>
                    </li>
                  ))}
                </ul>
              </AtrinCard>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">خدمات</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ATRIN_LANDING.services.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="atrin-action-card justify-center text-center font-semibold text-white"
              >
                {service.label}
              </Link>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">سؤالات متداول</h2>
          <div className="mt-5 space-y-2">
            {ATRIN_LANDING_EXTRA.faq.map((item) => (
              <AtrinExpandable key={item.q} title={item.q}>
                {item.a}
              </AtrinExpandable>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">نقشه راه</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ATRIN_LANDING_EXTRA.roadmap.map((item) => (
              <AtrinCard key={item.title} hover={false}>
                <p className="text-xs font-bold text-cyan-300">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {item.body}
                </p>
              </AtrinCard>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">نظرات (به‌زودی)</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {ATRIN_LANDING.testimonials.map((item) => (
              <blockquote
                key={item.name}
                className="atrin-glass rounded-[1.25rem] p-5 text-sm leading-7 text-slate-300"
              >
                «{item.quote}»
                <footer className="mt-3 text-xs text-slate-500">
                  — {item.name}
                </footer>
              </blockquote>
            ))}
          </div>
        </Section>

        <Section className="text-center">
          <div className="atrin-glass mx-auto max-w-2xl rounded-[1.75rem] px-6 py-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              {ATRIN_LANDING.ctaTitle}
            </h2>
            <p className="mt-3 text-sm text-slate-300">{ATRIN_LANDING.ctaBody}</p>
            <a
              href="#atrin-chat"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-[#7c3aed] to-[#4c1d95] px-6 text-sm font-bold text-white shadow-[0_0_28px_rgb(124_58_237_/_0.45)]"
            >
              گفتگو با آترین
            </a>
          </div>
        </Section>

        <Section>
          <div id="atrin-chat" className="scroll-mt-24 space-y-4">
            <h2 className="text-2xl font-bold">گفتگو با آترین</h2>
            <AtrinEmbeddedChat />
          </div>
        </Section>
      </main>
    </div>
  );
}
