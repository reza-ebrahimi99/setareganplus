"use client";

/**
 * Guidance Journey Engine — right sidebar vertical timeline (Phase 1).
 * Presentation only. Locked steps render with no href — nothing to click.
 */

import { PortalIcon, type PortalIconName } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type GuidanceStepSidebarProps = {
  steps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
};

export function GuidanceStepSidebar({
  steps,
  completionPercentage,
}: GuidanceStepSidebarProps) {
  return (
    <aside className="gpj-sidebar" aria-label="مسیر گام‌به‌گام انتخاب رشته">
      <div className="gpj-sidebar__head">
        <p className="gpj-sidebar__eyebrow">سفر هدایت تحصیلی</p>
        <div className="gpj-sidebar__progress">
          <div className="gpj-sidebar__progress-track">
            <div
              className="gpj-sidebar__progress-fill"
              style={{ width: `${Math.max(4, completionPercentage)}%` }}
            />
          </div>
          <span className="gpj-sidebar__progress-label">
            {toPersianDigits(completionPercentage)}٪ تکمیل‌شده
          </span>
        </div>
      </div>

      <ol className="gpj-timeline">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`gpj-timeline__item gpj-timeline__item--${step.status}`}
          >
            <span className="gpj-timeline__rail" aria-hidden="true">
              <span className="gpj-timeline__dot">
                {step.status === "completed" ? (
                  <CheckGlyph />
                ) : step.status === "locked" ? (
                  <LockGlyph />
                ) : (
                  <span className="gpj-timeline__dot-number">
                    {toPersianDigits(step.id)}
                  </span>
                )}
              </span>
              {index < steps.length - 1 ? (
                <span className="gpj-timeline__line" />
              ) : null}
            </span>

            <div className="gpj-timeline__body">
              <span className="gpj-timeline__icon" aria-hidden="true">
                <PortalIcon name={step.icon as PortalIconName} className="size-4" />
              </span>
              <div className="gpj-timeline__text">
                <p className="gpj-timeline__title">{step.title}</p>
                <p className="gpj-timeline__desc">{step.description}</p>
              </div>
              <span className="gpj-timeline__status">
                {step.status === "completed"
                  ? "انجام شد"
                  : step.status === "active"
                    ? "در حال انجام"
                    : "قفل"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5">
      <path
        d="M4 10.5 8 14.5 16 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3">
      <rect
        x="4.5"
        y="8.5"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
