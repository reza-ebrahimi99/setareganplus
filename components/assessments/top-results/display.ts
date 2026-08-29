import type { PublicAssessmentTopResult } from "@/lib/assessment/featured-results";

export function studentDisplayName(result: PublicAssessmentTopResult): string {
  const composed = `${result.firstName} ${result.lastName}`.trim();
  return composed || result.fullName;
}

export function studentInitials(result: PublicAssessmentTopResult): string {
  const first = result.firstName.trim().slice(0, 1);
  const last = result.lastName.trim().slice(0, 1);
  if (first && last) return `${first}${last}`;
  return studentDisplayName(result).slice(0, 2) || "؟";
}

/** Decorative emoji for major subsection headers (UI only). */
export function majorHeaderEmoji(majorName: string | null | undefined): string {
  const name = (majorName ?? "").toLocaleLowerCase("fa");
  if (name.includes("تجرب") || name.includes("experimental")) return "🧪";
  if (name.includes("ریاض") || name.includes("فیزیک") || name.includes("math")) {
    return "📐";
  }
  if (name.includes("انسان") || name.includes("human")) return "📖";
  if (name.includes("فنی") || name.includes("technical")) return "⚙️";
  return "🎓";
}

export function splitPodiumAndRest(results: PublicAssessmentTopResult[]): {
  podium: PublicAssessmentTopResult[];
  rest: PublicAssessmentTopResult[];
} {
  const podium: PublicAssessmentTopResult[] = [];
  const rest: PublicAssessmentTopResult[] = [];
  for (const result of results) {
    if (result.rank >= 1 && result.rank <= 3) {
      podium.push(result);
    } else {
      rest.push(result);
    }
  }
  podium.sort((a, b) => a.rank - b.rank);
  rest.sort((a, b) => a.rank - b.rank);
  return { podium, rest };
}
