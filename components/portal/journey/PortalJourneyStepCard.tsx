import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { PortalSurface } from "@/components/portal/PortalSurface";
import {
  JOURNEY_STATE_ACCENT,
  JOURNEY_STATE_ICON,
  JOURNEY_STATE_LABEL,
  type PortalJourneyStep,
} from "@/components/portal/journey/types";
import { toPersianDigits } from "@/lib/persian";

type PortalJourneyStepCardProps = {
  step: PortalJourneyStep;
  index: number;
};

export function PortalJourneyStepCard({
  step,
  index,
}: PortalJourneyStepCardProps) {
  const stateAccent = JOURNEY_STATE_ACCENT[step.state];
  const stateIcon = JOURNEY_STATE_ICON[step.state];

  return (
    <PortalSurface
      as="li"
      accent={step.accent}
      padding="lg"
      interactive={step.state === "active" || step.state === "waiting"}
      className={[
        "portal-journey-step",
        `portal-journey-step--${step.state}`,
      ].join(" ")}
      dataAttributes={{
        "data-journey-state": step.state,
        "data-journey-step-id": step.id,
      }}
    >
      <div className="portal-journey-step__rail" aria-hidden="true">
        <span className="portal-journey-step__index">
          {toPersianDigits(index + 1)}
        </span>
      </div>

      <div className="portal-journey-step__body">
        <div className="portal-journey-step__top">
          <span
            className="portal-journey-step__icon"
            data-portal-accent={step.accent}
            aria-hidden="true"
          >
            <PortalIcon name={step.icon} className="size-7" />
          </span>
          <span
            className="portal-journey-step__status"
            data-portal-accent={stateAccent}
          >
            <PortalIcon name={stateIcon} className="size-3.5" />
            {JOURNEY_STATE_LABEL[step.state]}
          </span>
        </div>

        <h3 className="portal-journey-step__title">{step.title}</h3>
        <p className="portal-journey-step__description">{step.description}</p>

        {step.outcome ? (
          <p className="portal-journey-step__outcome">
            <span>نتیجه این قدم:</span> {step.outcome}
          </p>
        ) : null}

        {step.eta ? (
          <p className="portal-journey-step__eta">{step.eta}</p>
        ) : null}

        {step.helpText ? (
          <p className="portal-journey-step__help">{step.helpText}</p>
        ) : null}

        {step.action ? (
          <Link href={step.action.href} className="portal-journey-step__cta">
            {step.action.label}
          </Link>
        ) : step.state === "locked" ? (
          <p className="portal-journey-step__locked-hint">
            با تکمیل قدم‌های قبلی، این مرحله روشن می‌شود.
          </p>
        ) : step.state === "completed" ? (
          <p className="portal-journey-step__done-hint">این نقطه عطف ثبت شد.</p>
        ) : null}
      </div>
    </PortalSurface>
  );
}
