"use client";

import { useMemo } from "react";
import {
  runEducationEngine,
  type EducationAnalysis,
  type EducationFormattedPlan,
} from "@/lib/atrin/education";

export function useEducationEngine(query: string | null | undefined): {
  analysis: EducationAnalysis | null;
  plan: EducationFormattedPlan | null;
  active: boolean;
} {
  return useMemo(() => {
    const text = query?.trim();
    if (!text) {
      return { analysis: null, plan: null, active: false };
    }
    const { analysis, plan } = runEducationEngine(text);
    return {
      analysis,
      plan,
      active: analysis.isEducational,
    };
  }, [query]);
}
