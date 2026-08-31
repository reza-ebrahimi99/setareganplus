import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { OfficeJourneyTrackerModel } from "@/lib/guidance/office/tracker";
import { AtelierReveal } from "@/components/guidance/office/AtelierMotion";

const DOC_STATUS: Record<string, string> = {
  missing: "جا دارد",
  ready: "روی میز است",
  pending: "نزد مشاور",
};

export function JourneyTracker({ model }: { model: OfficeJourneyTrackerModel }) {
  return (
    <div className="atelier-path">
      <AtelierReveal>
        <header className="atelier-path__hero">
          <p className="atelier-kicker">مسیر همراهی</p>
          <h1 className="atelier-title">از شناخت خود تا فهرست نهایی</h1>
          <p className="atelier-lead">
            این یک ویزارد اداری نیست. هر فصل، یک اتاق در دفتر است. مرحله جاری
            روشن است؛ بقیه آرام منتظر می‌مانند.
          </p>
          <p className="atelier-now-line">
            <span>{toPersianDigits(model.completionPercentage)}٪</span>
            اکنون: {model.currentTitle}
          </p>
          <a className="atelier-jump" href={`#phase-${model.currentStep}`}>
            رفتن به جایی که الان هستید
          </a>
        </header>
      </AtelierReveal>

      <ol className="atelier-path__list">
        {model.phases.map((phase, index) => (
          <li key={phase.id}>
            {phase.chapterStart ? (
              <h2 className="atelier-path__chapter">{phase.chapter}</h2>
            ) : null}
            <AtelierReveal delay={Math.min(index * 0.03, 0.24)}>
              <article
                id={`phase-${phase.id}`}
                className={`atelier-phase is-${phase.status}`}
                aria-current={phase.status === "active" ? "step" : undefined}
              >
                <span className="atelier-phase__dot" aria-hidden="true">
                  {toPersianDigits(phase.id)}
                </span>
                <p className="atelier-kicker">{phase.statusLabel}</p>
                <h3>{phase.storyTitle}</h3>
                <p className="atelier-phase__story">{phase.purpose}</p>

                {phase.status !== "locked" ? (
                  <div className="atelier-phase__chips">
                    <span>{phase.estimatedDuration}</span>
                    <span>{phase.counselorLabel}</span>
                    {phase.nextAction ? <span>{phase.nextAction}</span> : null}
                  </div>
                ) : null}

                {phase.counselorMessage ? (
                  <p className="atelier-phase__note">{phase.counselorMessage}</p>
                ) : null}

                {phase.lockReason ? (
                  <p className="atelier-phase__story">{phase.lockReason}</p>
                ) : null}

                {phase.status === "active" ? (
                  <>
                    <ul className="atelier-check">
                      {phase.requiredActions.map((action) => (
                        <li
                          key={action.id}
                          data-done={action.done ? "true" : "false"}
                        >
                          {action.label}
                        </li>
                      ))}
                    </ul>
                    {phase.documents.length > 0 ? (
                      <div className="atelier-stamps">
                        {phase.documents.map((doc) => (
                          <span key={doc.id} data-doc={doc.status}>
                            {doc.label} · {DOC_STATUS[doc.status] ?? doc.status}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {phase.knowledgeNote && phase.status !== "locked" ? (
                  <p className="atelier-phase__story">{phase.knowledgeNote}</p>
                ) : null}

                {phase.href && phase.hrefLabel ? (
                  <Link href={phase.href} className="atelier-cta">
                    {phase.hrefLabel}
                  </Link>
                ) : null}
              </article>
            </AtelierReveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
