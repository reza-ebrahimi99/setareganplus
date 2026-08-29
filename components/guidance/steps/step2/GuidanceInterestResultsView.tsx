/**
 * Guidance Journey Engine Step 2 — immediate results presentation.
 * Server- and client-safe (no hooks); reused by the counselor panel too.
 */

import { ASSESSMENT_CATEGORIES } from "@/lib/guidance/journey/assessment/categories";
import { toPersianDigits } from "@/lib/persian";
import type { AssessmentResult } from "@/lib/guidance/journey/assessment/scoring";

export function GuidanceInterestResultsView({
  result,
}: {
  result: AssessmentResult;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="gpj-card" data-portal-accent="gold">
        <h2 className="gpj-card__title">پروفایل شخصیتی تو</h2>
        <p style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--gpj-purple)" }}>
          {result.personality.title}
        </p>
        <p className="gpj-card__desc" style={{ marginTop: "0.375rem" }}>
          {result.personality.description}
        </p>
      </div>

      <div className="gpj-card">
        <h2 className="gpj-card__title">نمرات ۱۱ بُعد رغبت</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {result.categoryScores
            .slice()
            .sort((a, b) => b.normalizedScore - a.normalizedScore)
            .map((score) => {
              const category = ASSESSMENT_CATEGORIES.find((c) => c.id === score.categoryId)!;
              return (
                <div key={score.categoryId}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                    <span style={{ fontWeight: 600 }}>{category.title}</span>
                    <span style={{ color: "var(--color-muted, #6b7280)" }}>
                      {toPersianDigits(score.normalizedScore)}٪
                    </span>
                  </div>
                  <div className="gpj-shell__mobile-progress-track" style={{ marginTop: "0.25rem" }}>
                    <div
                      className="gpj-shell__mobile-progress-fill"
                      style={{ width: `${score.normalizedScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="gpj-card">
          <h2 className="gpj-card__title">رشته‌های متناسب با تو</h2>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {result.suitableMajors.map((major) => (
              <li
                key={major.clusterId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderRadius: "0.75rem",
                  background: "color-mix(in srgb, var(--gpj-green) 10%, transparent)",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8437rem",
                  fontWeight: 600,
                }}
              >
                <span>{major.title}</span>
                <span>{toPersianDigits(major.fitScore)}٪</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="gpj-card">
          <h2 className="gpj-card__title">رشته‌های کمتر متناسب</h2>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {result.lessSuitableMajors.map((major) => (
              <li
                key={major.clusterId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderRadius: "0.75rem",
                  background: "#f8fafc",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8437rem",
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                <span>{major.title}</span>
                <span>{toPersianDigits(major.fitScore)}٪</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
