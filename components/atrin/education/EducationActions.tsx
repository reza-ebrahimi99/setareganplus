"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  EDUCATION_ACTION_LABELS,
  promptForEducationAction,
  type EducationActionId,
  type EducationAnalysis,
  type EducationFormattedPlan,
} from "@/lib/atrin/education";

type EducationActionsProps = {
  analysis: EducationAnalysis;
  plan: EducationFormattedPlan;
  onSelect: (prompt: string) => void;
};

export function EducationActions({
  analysis,
  plan,
  onSelect,
}: EducationActionsProps) {
  const reduce = useReducedMotion();
  const topic =
    analysis.subject.value !== "unknown" ? analysis.subject.value : undefined;

  const primary: EducationActionId[] = analysis.homeworkMode
    ? ["hint_only", "show_steps", "show_answer", "another_exercise"]
    : plan.actions.slice(0, 6);

  return (
    <div className="space-y-2" aria-label="اقدام‌های آموزشی">
      <p className="text-[0.7rem] font-medium text-slate-400">اقدام آموزشی</p>
      <ul className="flex flex-wrap gap-2">
        {primary.map((action, index) => (
          <motion.li
            key={action}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <button
              type="button"
              className="atrin-chip"
              onClick={() =>
                onSelect(promptForEducationAction(action, topic))
              }
            >
              {EDUCATION_ACTION_LABELS[action]}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
