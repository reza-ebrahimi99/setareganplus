import Link from "next/link";
import type { NextActionCard } from "@/lib/guidance/journey-v2/next-action";
import { toPersianDigits } from "@/lib/persian";

type Props = { card: NextActionCard };

export function StudentNextActionCard({ card }: Props) {
  return (
    <section className="gv2-status-card gv2-status-card--accent" aria-labelledby="gv2-next-action">
      <p className="gv2-status-card__eyebrow">اقدام بعدی شما</p>
      <h2 id="gv2-next-action">{card.actionLabel}</h2>
      <p>
        مرحله {toPersianDigits(String(card.currentStep))}: {card.currentStepTitle}
      </p>
      {card.blockerReason ? (
        <p className="gpj-banner gpj-banner--warn">{card.blockerReason}</p>
      ) : null}
      {card.state !== "completed" ? (
        <Link className="gjv2-nav__button gjv2-nav__button--next" href={card.href}>
          انجام اقدام
        </Link>
      ) : null}
    </section>
  );
}
