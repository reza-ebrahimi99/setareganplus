"use client";

import { AtrinBadge, AtrinCard } from "@/components/atrin/ui";
import type {
  EducationAnalysis,
  EducationBlockKind,
  EducationFormattedPlan,
} from "@/lib/atrin/education";

const BLOCK_STYLES: Record<
  EducationBlockKind,
  { shell: string; title: string }
> = {
  math: {
    shell: "!border-cyan-400/25 !bg-cyan-500/10",
    title: "بلوک ریاضی",
  },
  chemistry: {
    shell: "!border-emerald-400/25 !bg-emerald-500/10",
    title: "بلوک شیمی",
  },
  physics: {
    shell: "!border-violet-400/25 !bg-violet-500/10",
    title: "بلوک فیزیک",
  },
  language: {
    shell: "!border-pink-400/25 !bg-pink-500/10",
    title: "بلوک زبان",
  },
  history: {
    shell: "!border-amber-400/25 !bg-amber-500/10",
    title: "بلوک علوم انسانی",
  },
  programming: {
    shell: "!border-sky-400/25 !bg-sky-500/10",
    title: "بلوک برنامه‌نویسی",
  },
  generic: {
    shell: "!border-white/15 !bg-white/5",
    title: "بلوک آموزشی",
  },
};

const SUBJECT_FA: Record<string, string> = {
  math: "ریاضی",
  science: "علوم",
  physics: "فیزیک",
  chemistry: "شیمی",
  biology: "زیست",
  geometry: "هندسه",
  statistics: "آمار",
  calculus: "حسابان",
  discrete_math: "ریاضی گسسته",
  persian: "فارسی",
  writing: "نگارش",
  dictation: "املا",
  arabic: "عربی",
  english: "انگلیسی",
  religion: "دینی",
  history: "تاریخ",
  geography: "جغرافیا",
  social_studies: "مطالعات اجتماعی",
  gifted: "تیزهوشان",
  konkur: "کنکور",
  programming: "برنامه‌نویسی",
  general_knowledge: "دانش عمومی",
  unknown: "عمومی",
};

type EducationSubjectBlockProps = {
  analysis: EducationAnalysis;
  plan: EducationFormattedPlan;
};

export function EducationSubjectBlock({
  analysis,
  plan,
}: EducationSubjectBlockProps) {
  const style = BLOCK_STYLES[plan.block];
  const topics = [
    ...analysis.mathTopics,
    ...analysis.chemistryTopics,
    ...analysis.physicsTopics,
    ...analysis.languageTopics,
  ].slice(0, 6);

  return (
    <AtrinCard className={`!p-3 ${style.shell}`} hover={false}>
      <div className="flex flex-wrap items-center gap-2">
        <AtrinBadge color={plan.labels.accent}>{plan.labels.title}</AtrinBadge>
        <AtrinBadge color="#94a3b8">
          {SUBJECT_FA[analysis.subject.value] ?? analysis.subject.value}
        </AtrinBadge>
        {analysis.grade.value ? (
          <AtrinBadge color="#38bdf8">پایه {analysis.grade.value}</AtrinBadge>
        ) : null}
        {analysis.difficulty.value !== "unknown" ? (
          <AtrinBadge color="#fbbf24">{analysis.difficulty.value}</AtrinBadge>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-300">{plan.labels.tip}</p>
      {topics.length > 0 ? (
        <p className="mt-2 text-[0.65rem] text-slate-500">
          مباحث: {topics.join(" · ")}
        </p>
      ) : null}
    </AtrinCard>
  );
}
