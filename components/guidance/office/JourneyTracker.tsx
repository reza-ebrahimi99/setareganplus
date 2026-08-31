import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { OfficeJourneyTrackerModel } from "@/lib/guidance/office/tracker";

export function JourneyTracker({ model }: { model: OfficeJourneyTrackerModel }) {
  const width = Math.max(4, Math.min(100, model.completionPercentage));

  return (
    <div className="office-tracker">
      <header className="office-tracker__hero">
        <p>نقشه مسیر مشاوره</p>
        <h1>از شناسنامه تا تأیید نهایی</h1>
        <p className="office-tracker__lead">
          همه مراحل پرونده شما اینجاست. مرحله جاری مشخص است؛ مراحل بعدی با دلیل
          قفل‌اند؛ مراحل تمام‌شده را می‌توانید همین‌جا مرور کنید.
        </p>
        <div className="office-tracker__progress" aria-label="پیشرفت پرونده">
          <div className="office-tracker__progress-row">
            <span>تکمیل پرونده</span>
            <strong>{toPersianDigits(model.completionPercentage)}٪</strong>
          </div>
          <div
            className="office-tracker__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={model.completionPercentage}
          >
            <span style={{ width: `${width}%` }} />
          </div>
        </div>
        <a className="office-tracker__jump" href={`#phase-${model.currentStep}`}>
          رفتن به مرحله جاری: {model.currentTitle}
        </a>
      </header>

      <ol className="office-tracker__list">
        {model.phases.map((phase) => (
            <li key={phase.id} className="office-tracker__block">
              {phase.chapterStart ? (
                <h2 className="office-tracker__chapter">{phase.chapter}</h2>
              ) : null}
              <article
                id={`phase-${phase.id}`}
                className={`office-tracker__card is-${phase.status}`}
                aria-current={phase.status === "active" ? "step" : undefined}
              >
                <span className="office-tracker__index" aria-hidden="true">
                  {toPersianDigits(phase.id)}
                </span>
                <div className="office-tracker__body">
                  <p className="office-tracker__kicker">{phase.statusLabel}</p>
                  <h3>{phase.title}</h3>
                  <p className="office-tracker__desc">{phase.description}</p>

                  <dl className="office-tracker__meta">
                    <div>
                      <dt>زمان تقریبی</dt>
                      <dd>{phase.estimatedDuration}</dd>
                    </div>
                    <div>
                      <dt>وضعیت شما</dt>
                      <dd>{phase.statusLabel}</dd>
                    </div>
                    <div>
                      <dt>وضعیت مشاور</dt>
                      <dd data-counselor={phase.counselorKind}>
                        {phase.counselorLabel}
                      </dd>
                    </div>
                  </dl>

                  {phase.counselorMessage ? (
                    <p className="office-tracker__note">{phase.counselorMessage}</p>
                  ) : null}

                  {phase.lockReason ? (
                    <p className="office-tracker__lock">{phase.lockReason}</p>
                  ) : null}

                  <div className="office-tracker__actions">
                    <p>اقدام‌های لازم</p>
                    <ul>
                      {phase.requiredActions.map((action) => (
                        <li
                          key={action.id}
                          data-done={action.done ? "true" : "false"}
                        >
                          {action.done ? "انجام شد — " : ""}
                          {action.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {phase.knowledgeNote ? (
                    <p className="office-tracker__knowledge">{phase.knowledgeNote}</p>
                  ) : null}

                  {phase.href && phase.hrefLabel ? (
                    <Link href={phase.href} className="office-tracker__cta">
                      {phase.hrefLabel}
                    </Link>
                  ) : null}

                  {phase.reviewable ? (
                    <p className="office-tracker__reviewed">این مرحله قابل مرور است.</p>
                  ) : null}
                </div>
              </article>
            </li>
        ))}
      </ol>
    </div>
  );
}
