import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { OfficeJourneyTrackerModel } from "@/lib/guidance/office/tracker";
import { ChamberReveal } from "@/components/guidance/office/ChamberMotion";
import { ChamberScene } from "@/components/guidance/office/ChamberScene";
import { ConstellationMark } from "@/components/guidance/office/illustrations";

const DOC_STATUS: Record<string, string> = {
  missing: "جا دارد",
  ready: "روی میز است",
  pending: "نزد مشاور",
};

export function JourneyTracker({ model }: { model: OfficeJourneyTrackerModel }) {
  return (
    <div>
      <ChamberReveal>
        <header className="chamber-hero">
          <div>
            <p className="chamber-kicker">مسیر همراهی</p>
            <h1 className="chamber-title">از شناخت خود تا فهرست نهایی</h1>
            <p className="chamber-lead">
              دوازده اتاق، یک خط طلایی. شما روی یک نقطه ایستاده‌اید. بقیه منتظر
              می‌مانند.
            </p>
            <a className="chamber-go" href={`#phase-${model.currentStep}`}>
              پرش به جایی که الان هستید — {toPersianDigits(model.completionPercentage)}٪
            </a>
          </div>
          <ChamberScene caption={model.currentTitle}>
            <ConstellationMark />
          </ChamberScene>
        </header>
      </ChamberReveal>

      <ol className="chamber-path">
        {model.phases.map((phase) => (
          <li key={phase.id}>
            {phase.chapterStart ? (
              <h2 className="chamber-path__chapter">{phase.chapter}</h2>
            ) : null}
            <article
              id={`phase-${phase.id}`}
              className={`chamber-mile is-${phase.status}`}
              aria-current={phase.status === "active" ? "step" : undefined}
            >
              <span className="chamber-mile__dot" aria-hidden="true" />
              <p className="chamber-kicker">{phase.statusLabel}</p>
              <h3>{phase.storyTitle}</h3>
              {phase.status === "active" ? (
                <>
                  <p className="chamber-mile__story">{phase.purpose}</p>
                  <p className="chamber-mile__story">
                    {phase.estimatedDuration} · {phase.counselorLabel}
                  </p>
                  {phase.counselorMessage ? (
                    <p className="chamber-mile__note">{phase.counselorMessage}</p>
                  ) : null}
                  <ul className="chamber-checks">
                    {phase.requiredActions.map((action) => (
                      <li key={action.id} data-done={action.done ? "true" : "false"}>
                        {action.label}
                      </li>
                    ))}
                  </ul>
                  {phase.documents.length > 0 ? (
                    <div className="chamber-stamps">
                      {phase.documents.map((doc) => (
                        <span key={doc.id} data-doc={doc.status}>
                          {doc.label} · {DOC_STATUS[doc.status] ?? doc.status}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {phase.lockReason ? (
                <p className="chamber-mile__story">{phase.lockReason}</p>
              ) : null}
              {phase.href && phase.hrefLabel ? (
                <Link href={phase.href} className="chamber-go">
                  {phase.hrefLabel}
                </Link>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
