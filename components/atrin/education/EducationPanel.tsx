"use client";

import { useEffect } from "react";
import { EducationActions } from "@/components/atrin/education/EducationActions";
import { EducationSubjectBlock } from "@/components/atrin/education/EducationSubjectBlock";
import { EducationTeachPath } from "@/components/atrin/education/EducationTeachPath";
import { useEducationEngine } from "@/hooks/useEducationEngine";
import { updateStudyProfileFromAnalysis } from "@/lib/atrin/education";
import { trackEducationUsage } from "@/lib/atrin/evaluation";

type EducationPanelProps = {
  query: string | null | undefined;
  onAction?: (prompt: string) => void;
  visible?: boolean;
};

/**
 * Additive education presentation layer under assistant replies.
 */
export function EducationPanel({
  query,
  onAction,
  visible = true,
}: EducationPanelProps) {
  const { analysis, plan, active } = useEducationEngine(query);

  useEffect(() => {
    if (!analysis || !active || !query) return;
    updateStudyProfileFromAnalysis({
      prompt: query,
      subject: analysis.subject.value,
      grade: analysis.grade.value,
      homeworkMode: analysis.homeworkMode,
      style: analysis.homeworkMode
        ? "hint_first"
        : analysis.strategy === "math_steps" ||
            analysis.strategy === "physics_formula" ||
            analysis.strategy === "chemistry_reaction"
          ? "step_by_step"
          : null,
      topic: analysis.mathTopics[0] ?? analysis.chemistryTopics[0] ?? undefined,
    });
    trackEducationUsage({
      subject: analysis.subject.value,
      grade: analysis.grade.value,
      topic: analysis.mathTopics[0] ?? analysis.subject.value,
    });
  }, [analysis, active, query]);

  if (!visible || !active || !analysis || !plan) return null;

  return (
    <div className="w-full space-y-3" aria-label="موتور آموزش آترین">
      <EducationSubjectBlock analysis={analysis} plan={plan} />
      <EducationTeachPath analysis={analysis} plan={plan} />
      {onAction ? (
        <EducationActions
          analysis={analysis}
          plan={plan}
          onSelect={onAction}
        />
      ) : null}
    </div>
  );
}
