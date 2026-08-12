"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AtrinBadge,
  AtrinCard,
  AtrinExpandable,
  AtrinTimeline,
} from "@/components/atrin/ui";
import {
  ATRIN_COUNSELOR_GOALS,
  ATRIN_PARENT_CARDS,
  ATRIN_STUDY_ACTIONS,
  ATRIN_TASK_TEMPLATES,
  type AtrinModeId,
} from "@/content/atrin";

export function AtrinStudyExperience({ visible }: { visible: boolean }) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-label="تجربه مطالعه"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AtrinBadge color="#22d3ee">خلاصه درس</AtrinBadge>
        <AtrinBadge color="#a78bfa">سطح متوسط</AtrinBadge>
        <AtrinBadge color="#34d399">≈ ۲۰ دقیقه</AtrinBadge>
      </div>

      <AtrinCard hover={false}>
        <p className="text-sm font-bold text-white">کارت مفهوم</p>
        <p className="mt-1 text-xs leading-6 text-slate-300">
          مفهوم اصلی را در یک پاراگراف کوتاه نگه دارید؛ جزئیات در پاسخ بالا آمده
          است.
        </p>
      </AtrinCard>

      <div className="grid gap-2 sm:grid-cols-2">
        <AtrinExpandable title="مثال حل‌شده" defaultOpen>
          گام‌به‌گام از صورت سؤال تا پاسخ نهایی را در پاسخ آترین دنبال کنید.
        </AtrinExpandable>
        <AtrinExpandable title="تمرین پیشنهادی">
          یک تمرین مشابه را خودتان حل کنید، سپس با پاسخ مقایسه کنید.
        </AtrinExpandable>
        <AtrinExpandable title="آزمونک کوتاه">
          ۳ سؤال مفهومی از همین مبحث بپرسید تا آترین حالت مطالعه را ادامه دهد.
        </AtrinExpandable>
        <AtrinExpandable title="موضوع بعدی">
          بعد از تثبیت، سراغ مبحث مرتبط یا تمرین بیشتر بروید.
        </AtrinExpandable>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ATRIN_STUDY_ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="atrin-action-card flex-col items-stretch gap-1 !p-2.5 text-center"
          >
            <span className="text-[0.75rem] font-bold text-white">
              {action.label}
            </span>
            <span className="text-[0.65rem] text-slate-400">{action.hint}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export function AtrinCounselorExperience({ visible }: { visible: boolean }) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-label="تجربه مشاوره"
    >
      <AtrinBadge color="#a78bfa">برنامه پیشنهادی</AtrinBadge>
      <AtrinTimeline
        items={[
          { title: "هدف این ماه", body: "یک هدف مشخص و قابل اندازه‌گیری" },
          { title: "برنامه هفتگی", body: "۳ تا ۵ جلسه مطالعه متمرکز" },
          { title: "ساعت مطالعه", body: "شروع با ۶–۸ ساعت در هفته" },
        ]}
      />
      <ul className="grid gap-2 sm:grid-cols-3">
        {ATRIN_COUNSELOR_GOALS.map((goal) => (
          <li key={goal.id}>
            <Link href={goal.href} className="atrin-action-card h-full flex-col">
              <span className="text-sm font-bold text-white">{goal.title}</span>
              <span className="text-xs text-slate-400">{goal.subtitle}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/consultation"
        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-gradient-to-l from-[#7c3aed] to-[#4c1d95] px-4 text-sm font-bold text-white shadow-[0_0_20px_rgb(124_58_237_/_0.4)]"
      >
        رزرو مشاوره
      </Link>
    </motion.div>
  );
}

export function AtrinParentExperience({ visible }: { visible: boolean }) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-label="تجربه والدین"
    >
      <AtrinCard hover={false}>
        <p className="text-sm font-bold text-pink-200">پیشرفت فرزند (نمایشی)</p>
        <p className="mt-1 text-xs leading-6 text-slate-400">
          به‌زودی گزارش واقعی پیشرفت متصل می‌شود. فعلاً مسیرهای مفید پذیرش و
          مشاوره در دسترس است.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/5 rounded-full bg-gradient-to-l from-pink-400 to-violet-500" />
        </div>
      </AtrinCard>
      <ul className="grid grid-cols-2 gap-2">
        {[
          ...ATRIN_PARENT_CARDS,
          {
            id: "faq",
            title: "سوالات متداول",
            subtitle: "پاسخ‌های سریع",
            href: "/faq",
          },
          {
            id: "tour",
            title: "بازدید مدرسه",
            subtitle: "گالری و فضای آموزشی",
            href: "/gallery",
          },
        ].map((card) => (
          <li key={card.id}>
            <Link href={card.href} className="atrin-action-card h-full flex-col">
              <span className="text-sm font-bold text-white">{card.title}</span>
              <span className="text-xs text-slate-400">{card.subtitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function AtrinTaskBoard({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="space-y-2" aria-label="وظایف پیشنهادی">
      <p className="text-[0.7rem] font-medium text-slate-400">وظایف پیشنهادی</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ATRIN_TASK_TEMPLATES.map((task) => (
          <li key={task.id}>
            <AtrinCard className="!p-3" hover={false}>
              <p className="text-sm font-bold text-white">{task.title}</p>
              <p className="mt-1 text-[0.7rem] text-slate-400">{task.hint}</p>
              <AtrinBadge color="#38bdf8">{task.kind}</AtrinBadge>
            </AtrinCard>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function shouldShowStudy(modeId: AtrinModeId): boolean {
  return modeId === "study";
}

export function shouldShowCounselor(modeId: AtrinModeId): boolean {
  return (
    modeId === "counselor" || modeId === "career" || modeId === "gifted"
  );
}

export function shouldShowParent(modeId: AtrinModeId): boolean {
  return modeId === "parent" || modeId === "admissions";
}

export function shouldShowTasks(modeId: AtrinModeId): boolean {
  return (
    modeId === "study" ||
    modeId === "counselor" ||
    modeId === "gifted" ||
    modeId === "career"
  );
}
