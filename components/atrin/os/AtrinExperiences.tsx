"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AiActionCard } from "@/components/ai/actions/AiActionCard";
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
import type { ActionCard } from "@/types/action-card";

type ExperienceActionsProps = {
  visible: boolean;
  onChat?: (prompt: string) => void;
  disabled?: boolean;
};

function toActionCard(
  partial: Omit<ActionCard, "priority"> & { priority?: number },
): ActionCard {
  return {
    ...partial,
    priority: partial.priority ?? 10,
  };
}

export function AtrinStudyExperience({
  visible,
  onChat,
  disabled = false,
}: ExperienceActionsProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  const steps = [
    {
      title: "گام ۱ — فهم صورت سؤال",
      body: "صورت سؤال را با دقت بخوان و داده‌ها را مشخص کن.",
    },
    {
      title: "گام ۲ — انتخاب روش",
      body: "قانون یا مفهوم مرتبط را از پاسخ آترین جدا کن.",
    },
    {
      title: "گام ۳ — حل مرحله‌ای",
      body: "پاسخ را خط‌به‌خط دنبال کن؛ عجله نکن.",
    },
    {
      title: "گام ۴ — خودت امتحان کن",
      body: "یک تمرین مشابه را بدون نگاه به جواب حل کن.",
    },
  ];

  const studyCards: ActionCard[] = ATRIN_STUDY_ACTIONS.map((action, index) =>
    toActionCard({
      id: `study-exp-${action.id}`,
      type: "chat",
      title: action.label,
      subtitle: action.hint,
      icon: action.id === "photo" ? "camera" : action.id === "plan" ? "calendar" : "chat",
      href: "#chat",
      prompt: action.prompt,
      priority: (index + 1) * 10,
    }),
  );

  const followUps: ActionCard[] = [
    toActionCard({
      id: "study-simpler",
      type: "chat",
      title: "مثال ساده‌تر",
      subtitle: "یک نمونه آسان‌تر بخواه",
      icon: "spark",
      href: "#chat",
      prompt: "یک مثال ساده‌تر بده",
      priority: 10,
    }),
    toActionCard({
      id: "study-harder",
      type: "chat",
      title: "مثال سخت‌تر",
      subtitle: "چالش بعدی",
      icon: "book",
      href: "#chat",
      prompt: "یک مثال سخت‌تر بده",
      priority: 20,
    }),
  ];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-label="تجربه مطالعه"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AtrinBadge color="#22d3ee">🎉 حالت مطالعه فعال شد</AtrinBadge>
        <AtrinBadge color="#a78bfa">سطح متوسط</AtrinBadge>
        <AtrinBadge color="#34d399">≈ ۲۰ دقیقه</AtrinBadge>
      </div>

      <AtrinCard hover={false}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">مسیر یادگیری</p>
          <span className="text-[0.65rem] text-slate-400">انگیزه ۸۲٪</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-violet-500"
            initial={{ width: "0%" }}
            animate={{ width: "62%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </AtrinCard>

      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.title}>
            <AtrinCard className="!p-3" hover={false}>
              <p className="text-xs font-bold text-cyan-300">{step.title}</p>
              <p className="mt-1 text-xs leading-6 text-slate-300">{step.body}</p>
              {index < steps.length - 1 ? (
                <p className="mt-1 text-center text-[0.65rem] text-slate-600">
                  ↓
                </p>
              ) : null}
            </AtrinCard>
          </li>
        ))}
      </ol>

      <div className="grid gap-2 sm:grid-cols-2">
        <AtrinExpandable title="اشتباهات رایج" defaultOpen>
          عجله در خواندن صورت سؤال، جا انداختن واحدها، و کپی بدون فهم مراحل.
        </AtrinExpandable>
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium text-slate-400">
            مثال دیگر می‌خواهی؟
          </p>
          {followUps.map((card) => (
            <AiActionCard
              key={card.id}
              card={card}
              onChat={onChat}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {studyCards.map((card) => (
          <AiActionCard
            key={card.id}
            card={card}
            onChat={onChat}
            disabled={disabled}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function AtrinCounselorExperience({
  visible,
  onChat,
  disabled = false,
}: ExperienceActionsProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  const goalCards: ActionCard[] = ATRIN_COUNSELOR_GOALS.map((goal, index) => {
    if (goal.type === "chat") {
      return toActionCard({
        id: `counsel-${goal.id}`,
        type: "chat",
        title: goal.title,
        subtitle: goal.subtitle,
        icon: "calendar",
        href: "#chat",
        prompt: goal.prompt,
        priority: (index + 1) * 10,
      });
    }
    return toActionCard({
      id: `counsel-${goal.id}`,
      type: "navigate",
      title: goal.title,
      subtitle: goal.subtitle,
      icon: goal.id === "gifted" ? "graduation" : "book",
      href: goal.href,
      priority: (index + 1) * 10,
    });
  });

  const bookCard = toActionCard({
    id: "counsel-book",
    type: "open-form",
    title: "رزرو مشاوره",
    subtitle: "شروع جلسه با مشاور",
    icon: "graduation",
    href: "/consultation",
    priority: 5,
  });

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-label="تجربه مشاوره"
    >
      <AtrinBadge color="#a78bfa">داشبورد برنامه</AtrinBadge>
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { title: "هدف", body: "یک هدف مشخص ماهانه" },
          { title: "سطح فعلی", body: "شروع با برنامه واقع‌بینانه" },
          { title: "مایل‌استون بعدی", body: "اولین هفته منسجم" },
        ].map((card) => (
          <AtrinCard key={card.title} className="!p-3" hover={false}>
            <p className="text-xs font-bold text-[#c4b5fd]">{card.title}</p>
            <p className="mt-1 text-xs text-slate-300">{card.body}</p>
          </AtrinCard>
        ))}
      </div>
      <AtrinTimeline
        items={[
          { title: "شنبه تا دوشنبه", body: "مرور پایه · ۲ جلسه" },
          { title: "سه‌شنبه تا پنج‌شنبه", body: "تمرین هدفمند · ۲ جلسه" },
          { title: "جمعه", body: "جمع‌بندی و استراحت فعال" },
        ]}
      />
      <AtrinCard hover={false} className="!p-3">
        <p className="text-xs font-bold text-white">لیست اقدام</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          <li>• موضوع اصلی هفته را مشخص کن</li>
          <li>• ۳ بلوک زمانی در تقویم بگذار</li>
          <li>• یک جلسه مشاوره رزرو کن</li>
        </ul>
        <p className="mt-2 text-[0.7rem] text-emerald-300">
          انگیزه: پیشرفت کوچک روزانه از بی‌برنامگی بهتر است.
        </p>
      </AtrinCard>
      <ul className="grid gap-2 sm:grid-cols-3">
        {goalCards.map((card) => (
          <li key={card.id}>
            <AiActionCard card={card} onChat={onChat} disabled={disabled} />
          </li>
        ))}
      </ul>
      <AiActionCard card={bookCard} onChat={onChat} disabled={disabled} />
    </motion.div>
  );
}

export function AtrinParentExperience({
  visible,
  disabled = false,
}: ExperienceActionsProps) {
  const reduce = useReducedMotion();
  if (!visible) return null;

  const cards: ActionCard[] = [
    ...ATRIN_PARENT_CARDS.map((card, index) =>
      toActionCard({
        id: `parent-${card.id}`,
        type: card.type,
        title: card.title,
        subtitle: card.subtitle,
        icon:
          card.id === "admissions"
            ? "register"
            : card.id === "achievements"
              ? "trophy"
              : card.id === "consultation"
                ? "graduation"
                : "phone",
        href: card.href,
        priority: (index + 1) * 10,
      }),
    ),
    toActionCard({
      id: "parent-faq",
      type: "navigate",
      title: "سؤالات والدین",
      subtitle: "پاسخ‌های پرتکرار",
      icon: "book",
      href: "/faq",
      priority: 50,
    }),
    toActionCard({
      id: "parent-tour",
      type: "navigate",
      title: "آشنایی با مدرسه",
      subtitle: "گالری و فضای آموزشی",
      icon: "gallery",
      href: "/gallery",
      priority: 60,
    }),
  ];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-label="تجربه والدین"
    >
      <AtrinBadge color="#f472b6">حالت والدین · گرم و همراه</AtrinBadge>
      <AtrinCard
        hover={false}
        className="!border-pink-400/20 !bg-gradient-to-br !from-pink-500/10 !to-violet-500/10"
      >
        <p className="text-sm font-bold text-pink-100">پیشرفت فرزند (نمایشی)</p>
        <p className="mt-1 text-xs leading-6 text-slate-300">
          این بخش برای همراهی والدین طراحی شده؛ گزارش واقعی بعداً متصل می‌شود.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[48%] rounded-full bg-gradient-to-l from-pink-400 to-violet-400" />
        </div>
      </AtrinCard>
      <ul className="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <li key={card.id}>
            <AiActionCard card={card} disabled={disabled} />
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function AtrinTaskBoard({
  visible,
  onChat,
  disabled = false,
}: ExperienceActionsProps) {
  if (!visible) return null;

  const cards: ActionCard[] = ATRIN_TASK_TEMPLATES.map((task, index) =>
    toActionCard({
      id: `task-${task.id}`,
      type: "chat",
      title: task.title,
      subtitle: task.hint,
      icon:
        task.kind === "homework"
          ? "book"
          : task.kind === "planning"
            ? "calendar"
            : task.kind === "reminder"
              ? "phone"
              : "spark",
      href: "#chat",
      prompt: task.prompt,
      priority: (index + 1) * 10,
    }),
  );

  return (
    <div className="space-y-2" aria-label="وظایف پیشنهادی">
      <p className="text-[0.7rem] font-medium text-slate-400">وظایف پیشنهادی</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.id}>
            <AiActionCard card={card} onChat={onChat} disabled={disabled} />
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
