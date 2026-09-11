"use client";

import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

export function GuidanceJourneyV2Sidebar({
  steps,
}: {
  steps: readonly GuidanceJourneySidebarStep[];
}) {
  return (
    <aside className="gjv2-sidebar" aria-label="مراحل انتخاب رشته">
      <ol className="gjv2-sidebar__list">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`gjv2-sidebar__item gjv2-sidebar__item--${step.status}`}
          >
            <span className="gjv2-sidebar__number">
              {step.status === "completed" ? (
                <CheckIcon />
              ) : (
                toPersianDigits(step.id)
              )}
            </span>

            <div className="gjv2-sidebar__content">
              <span className="gjv2-sidebar__stage">
                مرحله {toPersianDigits(step.id)}
              </span>
              <strong>{step.title}</strong>
            </div>

            <span className="gjv2-sidebar__state" aria-hidden="true">
              {step.status === "locked" ? <LockIcon /> : <ArrowIcon />}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
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

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect
        x="4.5"
        y="8.5"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="m12 5-5 5 5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
