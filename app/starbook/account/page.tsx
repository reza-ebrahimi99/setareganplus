import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import { StarBookStudentHub } from "@/components/starbook/StarBookPlayHud";
import { StarBookReveal } from "@/components/starbook/StarBookMotion";

export default function StarBookAccountPage() {
  return (
    <StarBookFrame activePath="/account">
      <section className="starbook-hero starbook-hero-immersive">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">هاب دانش‌آموز</span>
          <h1>جهان کوچک تو در استاربوک.</h1>
          <p>کتابخانه، سفارش، نشان، استریک و پیشنهاد — بدون حس پنل اداری.</p>
        </div>
      </section>
      <StarBookReveal>
        <StarBookStudentHub />
      </StarBookReveal>
    </StarBookFrame>
  );
}
