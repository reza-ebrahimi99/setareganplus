"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AtrinMark } from "@/components/atrin/AtrinMark";
import {
  AtrinDelight,
  useAtrinDelight,
} from "@/components/atrin/os/AtrinDelight";
import { AtrinQuickStart } from "@/components/atrin/os/AtrinQuickStart";
import { AtrinLiveHero } from "@/components/atrin/presence/AtrinLiveHero";
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
  type AtrinModeId,
} from "@/content/atrin";
import { useAtrinProfile } from "@/hooks/useAtrinProfile";
import {
  loadAtrinProfile,
  markFirstChatCelebrated,
} from "@/lib/atrin/profile";
import { toPersianDigits } from "@/lib/persian";

const AtrinEmbeddedChat = dynamic(
  () =>
    import("@/components/atrin/AtrinEmbeddedChat").then(
      (mod) => mod.AtrinEmbeddedChat,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="atrin-glass flex h-[min(78vh,720px)] items-center justify-center rounded-[1.5rem] text-sm text-slate-400">
        <span className="atrin-cursor-blink">در حال آماده‌سازی آترین</span>
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

const MODE_DELIGHT: Partial<Record<AtrinModeId, string>> = {
  study: "🎉 حالت مطالعه فعال شد",
  counselor: "✨ حالت مشاوره فعال شد",
  parent: "👨‍👩‍👧 حالت والدین فعال شد",
  admissions: "🏫 مسیر پذیرش آماده است",
  gifted: "🏆 مسیر تیزهوشان فعال شد",
};

export function AtrinLandingPage() {
  const reduce = useReducedMotion();
  const modes = Object.values(ATRIN_MODES);
  const { profile, trackPrompt, refresh } = useAtrinProfile();
  const delight = useAtrinDelight();
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const lastMode = useRef<AtrinModeId | null>(null);

  const startChat = useCallback(() => {
    document.getElementById("atrin-chat")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [reduce]);

  const queuePrompt = useCallback(
    (prompt: string) => {
      trackPrompt(prompt);
      setPendingPrompt(prompt);
      startChat();
      const current = loadAtrinProfile();
      if (!current.firstChatCelebrated) {
        markFirstChatCelebrated();
        delight.celebrate("✨ اولین گفتگوی شما با آترین");
        refresh();
      }
    },
    [trackPrompt, startChat, delight, refresh],
  );

  const onModeChange = useCallback(
    (modeId: string) => {
      const id = modeId as AtrinModeId;
      if (lastMode.current && lastMode.current !== id && MODE_DELIGHT[id]) {
        delight.celebrate(MODE_DELIGHT[id]!);
      }
      lastMode.current = id;
    },
    [delight],
  );

  return (
    <div className="atrin-root atrin-space-bg min-h-screen text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b1a]/80 backdrop-blur-xl">
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
            <button
              type="button"
              onClick={startChat}
              className="hidden rounded-xl bg-gradient-to-l from-[#7c3aed] to-[#06b6d4] px-3 py-2 text-xs font-bold text-white sm:inline-flex"
            >
              گفتگو
            </button>
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
            >
              بازگشت به سایت
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-14 pb-24 pt-8 sm:space-y-16 sm:pt-12">
        <Section>
          <AtrinLiveHero profile={profile} onStartChat={startChat} />
        </Section>

        <Section id="atrin-chat" className="scroll-mt-24 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">گفتگوی زنده با آترین</h2>
              <p className="mt-1 text-sm text-slate-400">
                همین‌جا بپرس — حالت‌ها به‌صورت خودکار عوض می‌شوند.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="atrin-online-dot size-1.5 rounded-full bg-emerald-400" />
              آنلاین
            </span>
          </div>

          <AtrinQuickStart profile={profile} onSelect={queuePrompt} />

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <AtrinEmbeddedChat
              pendingPrompt={pendingPrompt}
              onPendingConsumed={() => setPendingPrompt(null)}
              onUserSend={trackPrompt}
              onModeChange={onModeChange}
            />
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
          <h2 className="text-2xl font-bold">حالت‌های گفتگو</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {modes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => queuePrompt(mode.suggestions[0] ?? mode.label)}
                className="atrin-glass rounded-2xl p-3 text-start transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]"
                style={{ boxShadow: `inset 0 0 0 1px ${mode.accent}44` }}
              >
                <p className="text-sm font-bold" style={{ color: mode.accent }}>
                  {mode.label}
                </p>
                <p className="mt-1 text-[0.7rem] leading-6 text-slate-400">
                  {mode.tip}
                </p>
              </button>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">نمونه‌های گفتگو</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ATRIN_LANDING.examples.map((example) => (
              <button
                key={example.q}
                type="button"
                onClick={() => queuePrompt(example.q)}
                className="text-start"
              >
                <AtrinCard hover>
                  <p className="text-sm font-semibold text-cyan-200">
                    کاربر: {example.q}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    آترین: {example.a}
                  </p>
                </AtrinCard>
              </button>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-bold">اعتماد مؤسسه</h2>
          <p className="mt-2 text-sm text-slate-400">
            آمار تأییدشده از محتوای درباره ما.
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
          <h2 className="text-2xl font-bold">پرامپت‌های محبوب</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {ATRIN_PROMPT_GROUPS.map((group) => (
              <AtrinCard key={group.id} hover={false}>
                <p className="text-sm font-bold text-[#c4b5fd]">{group.label}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {group.prompts.map((prompt) => (
                    <li key={prompt}>
                      <button
                        type="button"
                        className="atrin-chip"
                        onClick={() => queuePrompt(prompt)}
                      >
                        {prompt}
                      </button>
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

        <Section className="text-center">
          <div className="atrin-glass mx-auto max-w-2xl rounded-[1.75rem] px-6 py-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              {ATRIN_LANDING.ctaTitle}
            </h2>
            <p className="mt-3 text-sm text-slate-300">{ATRIN_LANDING.ctaBody}</p>
            <button
              type="button"
              onClick={startChat}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-[#7c3aed] to-[#4c1d95] px-6 text-sm font-bold text-white shadow-[0_0_28px_rgb(124_58_237_/_0.45)]"
            >
              گفتگو با آترین
            </button>
          </div>
        </Section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        {ATRIN_BRAND.product} · {ATRIN_BRAND.subtitle}
      </footer>

      <AtrinDelight message={delight.message} onDone={delight.clear} />
    </div>
  );
}
