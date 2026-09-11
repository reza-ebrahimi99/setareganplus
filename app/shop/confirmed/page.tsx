import Link from "next/link";
import { StarBookConfetti } from "@/components/starbook/StarBookConfetti";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import { StarBookMagnetic } from "@/components/starbook/StarBookMotion";

export default function StarBookConfirmedPage() {
  return (
    <StarBookFrame activePath="/shop/account">
      <section className="starbook-hero starbook-hero-immersive relative overflow-hidden">
        <StarBookHeroScene />
        <StarBookConfetti />
        <div className="relative z-[1]">
          <span className="starbook-kicker">پرداخت موفق · جشن کوتاه</span>
          <h1>رسید تو در راه است.</h1>
          <p>
            بعد از پرداخت موفق، پیامک کد کوتاه می‌آید. همان کد را در پیگیری بزن تا QR تحویل باز شود.
            می‌توانی رسید را از صفحه پرداخت ذخیره کنی و با دوستانت شِیر کنی.
          </p>
          <div className="starbook-cta-row">
            <StarBookMagnetic href="/shop/track">پیگیری سفارش</StarBookMagnetic>
            <Link href="/shop" className="starbook-btn starbook-btn-ghost">
              ادامه کشف
            </Link>
            <Link href="/shop/account/points" className="starbook-btn starbook-btn-ghost">
              دیدن XP
            </Link>
          </div>
        </div>
      </section>
    </StarBookFrame>
  );
}
