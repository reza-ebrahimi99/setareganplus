"use client";

/**
 * Guidance Journey Engine — shared step page shell (Phase 1).
 * Header + right-hand vertical timeline + main content slot.
 * Handles the confetti celebration when a step just completed.
 */

import { useState } from "react";
import Link from "next/link";
import { GuidanceStepConfetti } from "@/components/guidance/steps/GuidanceStepConfetti";
import { GuidanceStepSidebar } from "@/components/guidance/steps/GuidanceStepSidebar";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type GuidanceStepShellProps = {
  stepId: number;
  stepCount: number;
  title: string;
  description: string;
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  celebrate?: boolean;
  children: React.ReactNode;
};

export function GuidanceStepShell({
  stepId,
  stepCount,
  title,
  description,
  sidebarSteps,
  completionPercentage,
  celebrate = false,
  children,
}: GuidanceStepShellProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [confettiActive, setConfettiActive] = useState(celebrate);

  return (
    <div className="gpj-shell" dir="rtl" data-portal-accent="purple">
      <GuidanceStepConfetti
        active={confettiActive}
        onDone={() => setConfettiActive(false)}
      />

      <header className="gpj-shell__header">
        <div className="gpj-shell__header-top">
          <Link href="/portal/student/services/guidance" className="gpj-shell__exit">
            <ExitIcon />
            خروج از مسیر
          </Link>
          <button
            type="button"
            className="gpj-shell__mobile-toggle"
            onClick={() => setShowTimeline((v) => !v)}
            aria-expanded={showTimeline}
          >
            نمای مسیر
          </button>
        </div>
        <p className="gpj-shell__step-tag">
          گام {toPersianDigits(stepId)} از {toPersianDigits(stepCount)}
        </p>
        <h1 className="gpj-shell__title">{title}</h1>
        <p className="gpj-shell__desc">{description}</p>
        <div className="gpj-shell__mobile-progress">
          <div className="gpj-shell__mobile-progress-track">
            <div
              className="gpj-shell__mobile-progress-fill"
              style={{ width: `${Math.max(4, completionPercentage)}%` }}
            />
          </div>
        </div>
      </header>

      <div className="gpj-shell__body">
        <main className="gpj-shell__main">{children}</main>
        <div
          className={`gpj-shell__sidebar-wrap ${showTimeline ? "gpj-shell__sidebar-wrap--open" : ""}`}
        >
          <GuidanceStepSidebar
            steps={sidebarSteps}
            completionPercentage={completionPercentage}
          />
        </div>
      </div>
    </div>
  );
}

function ExitIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M7.5 4H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h2.5M12.5 13.5 16 10l-3.5-3.5M16 10H8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
