"use client";

import Link from "next/link";
import { useState } from "react";
import { GuidanceJourneyV2Sidebar } from "@/components/guidance/journey-v2/GuidanceJourneyV2Sidebar";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type GuidanceJourneyV2ShellProps = {
  stepId: number;
  stepCount: number;
  title: string;
  description: string;
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  children: React.ReactNode;
};

export function GuidanceJourneyV2Shell({
  stepId,
  stepCount,
  title,
  description,
  sidebarSteps,
  completionPercentage,
  children,
}: GuidanceJourneyV2ShellProps) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="gjv2-shell" dir="rtl">
      <header className="gjv2-header">
        <div className="gjv2-header__top">
          <Link
            href="/portal/student/services/guidance"
            className="gjv2-header__back"
          >
            خروج از مسیر
          </Link>

          <button
            type="button"
            className="gjv2-header__steps-toggle"
            onClick={() => setShowSteps((value) => !value)}
            aria-expanded={showSteps}
          >
            نمایش مراحل
          </button>
        </div>

        <div className="gjv2-header__intro">
          <div>
            <p className="gjv2-header__step">
              مرحله {toPersianDigits(stepId)} از {toPersianDigits(stepCount)}
            </p>

            <h1>{title}</h1>

            <p>{description}</p>
          </div>

          <div className="gjv2-header__progress">
            <span>
              {toPersianDigits(completionPercentage)}٪
            </span>

            <div className="gjv2-header__progress-track">
              <div
                className="gjv2-header__progress-fill"
                style={{
                  width: `${Math.max(3, completionPercentage)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="gjv2-layout">
        <main className="gjv2-main">
          {children}
        </main>

        <div
          className={`gjv2-sidebar-wrap${
            showSteps ? " gjv2-sidebar-wrap--open" : ""
          }`}
        >
          <GuidanceJourneyV2Sidebar steps={sidebarSteps} />
        </div>
      </div>
    </div>
  );
}
