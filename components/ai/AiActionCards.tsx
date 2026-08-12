"use client";

import { AiActionButton } from "@/components/ai/AiActionButton";
import type { AiAction, AiRecommendation } from "@/types/ai-actions";

type AiActionCardsProps = {
  actions?: readonly AiAction[];
  recommendations?: readonly AiRecommendation[];
  suggestions?: readonly AiAction[];
};

function recommendationAsAction(item: AiRecommendation): AiAction {
  return {
    id: item.id,
    type: item.kind === "registration" ? "registration" : "page",
    label: item.label,
    href: item.href,
    description: item.reason,
    category: item.kind,
  };
}

export function AiActionCards({
  actions = [],
  recommendations = [],
  suggestions = [],
}: AiActionCardsProps) {
  if (
    actions.length === 0 &&
    recommendations.length === 0 &&
    suggestions.length === 0
  ) {
    return null;
  }

  return (
    <div className="w-full max-w-[92%] space-y-3">
      {actions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium tracking-wide text-secondary">
            اقدام پیشنهادی
          </p>
          <ul className="grid gap-2">
            {actions.map((action) => (
              <li key={action.id}>
                <AiActionButton action={action} variant="action" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium tracking-wide text-secondary">
            پیشنهادهای هوشمند
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recommendations.map((item) => (
              <li key={item.id}>
                <AiActionButton
                  action={recommendationAsAction(item)}
                  variant="recommendation"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium tracking-wide text-secondary">
            میانبرهای سریع
          </p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <li key={`sug-${item.id}`}>
                <AiActionButton action={item} variant="recommendation" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
