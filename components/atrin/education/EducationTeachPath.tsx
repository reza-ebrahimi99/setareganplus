"use client";

import { AtrinBadge, AtrinCard, AtrinExpandable } from "@/components/atrin/ui";
import type {
  EducationAnalysis,
  EducationFormattedPlan,
  EducationResponseSection,
} from "@/lib/atrin/education";

const SECTION_LABEL: Record<EducationResponseSection, string> = {
  summary: "خلاصه",
  hint: "راهنما (بدون لو دادن جواب)",
  step: "گام‌به‌گام",
  final_answer: "جواب نهایی",
  common_mistakes: "اشتباهات رایج",
  exam_tips: "نکات آزمون",
  similar: "سؤال مشابه",
  practice: "تمرین بیشتر",
};

type EducationTeachPathProps = {
  analysis: EducationAnalysis;
  plan: EducationFormattedPlan;
};

/**
 * Teaching-first path — presentation hierarchy only (no AI rewrite).
 */
export function EducationTeachPath({
  analysis,
  plan,
}: EducationTeachPathProps) {
  return (
    <div className="space-y-2" aria-label="مسیر آموزش">
      <div className="flex flex-wrap gap-2">
        {analysis.homeworkMode ? (
          <AtrinBadge color="#c4b5fd">حالت تکلیف · اول یادگیری</AtrinBadge>
        ) : null}
        {analysis.examMode ? (
          <AtrinBadge color="#f87171">حالت آزمون</AtrinBadge>
        ) : null}
      </div>

      {analysis.homeworkMode ? (
        <AtrinCard hover={false} className="!p-3 !border-violet-400/20">
          <p className="text-xs font-bold text-[#c4b5fd]">پیشنهاد مسیر</p>
          <ol className="mt-2 space-y-1 text-xs leading-6 text-slate-300">
            <li>۱) فقط راهنما</li>
            <li>۲) گام‌به‌گام</li>
            <li>۳) جواب نهایی</li>
            <li>۴) یک تمرین مشابه</li>
          </ol>
        </AtrinCard>
      ) : null}

      {analysis.examMode ? (
        <AtrinCard hover={false} className="!p-3 !border-rose-400/20">
          <p className="text-xs font-bold text-rose-200">تحلیل آزمون</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>
              • سطح تخمینی:{" "}
              {analysis.difficulty.value === "unknown"
                ? "متوسط"
                : analysis.difficulty.value}
            </li>
            <li>
              • سطح مورد انتظار:{" "}
              {analysis.grade.value
                ? `پایه ${analysis.grade.value}`
                : "عمومی"}
            </li>
            <li>• مراقب تله‌های رایج صورت سؤال باش</li>
            <li>• اول داده‌ها را بنویس، بعد فرمول</li>
          </ul>
        </AtrinCard>
      ) : null}

      <div className="space-y-1.5">
        {plan.sections.map((section, index) => (
          <AtrinExpandable
            key={section}
            title={`${index + 1}. ${SECTION_LABEL[section]}`}
            defaultOpen={section === "summary" || section === "hint"}
          >
            {section === "hint"
              ? "قبل از دیدن جواب کامل، یک راهنما از پاسخ آترین استخراج کن و خودت ادامه بده."
              : section === "final_answer"
                ? "جواب نهایی را فقط بعد از فهم گام‌ها ببین."
                : section === "common_mistakes"
                  ? "اشتباهات پرتکرار این مبحث را از پاسخ مشخص کن و مرور کن."
                  : section === "exam_tips"
                    ? "برای سرعت در آزمون: داده‌ها، فرمول، واحدها."
                    : "این بخش را در پاسخ آترین دنبال کن و برای تثبیت، تمرین بخواه."}
          </AtrinExpandable>
        ))}
      </div>
    </div>
  );
}
