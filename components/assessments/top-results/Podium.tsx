import { PodiumCard } from "@/components/assessments/top-results/PodiumCard";
import type { PublicAssessmentTopResult } from "@/lib/assessment/featured-results";

type PodiumProps = {
  results: PublicAssessmentTopResult[];
};

function prominenceForRank(
  rank: number,
): "gold" | "silver" | "bronze" | null {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return null;
}

/**
 * Hall-of-fame podium for ranks 1–3.
 * Desktop / tablet: silver | gold (elevated, ~25% larger) | bronze.
 * Mobile: vertical stack gold → silver → bronze via order classes.
 */
export function Podium({ results }: PodiumProps) {
  const podium = results
    .filter((row) => row.rank >= 1 && row.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  if (podium.length === 0) return null;

  return (
    <ol
      className="hof-podium flex flex-col items-center gap-4 overflow-x-clip px-1 pt-2 sm:flex-row sm:items-end sm:justify-center sm:gap-4 sm:overflow-visible sm:px-2 sm:pt-6 sm:pb-2 lg:gap-5"
      aria-label="سکو قهرمانان"
    >
      {podium.map((result) => {
        const prominence = prominenceForRank(result.rank);
        if (!prominence) return null;
        return (
          <PodiumCard
            key={result.id}
            result={result}
            prominence={prominence}
          />
        );
      })}
    </ol>
  );
}
