import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import { StarBookStudentHub } from "@/components/starbook/StarBookPlayHud";
import { StarBookReveal } from "@/components/starbook/StarBookMotion";

export default function StarBookPointsPage() {
  return (
    <StarBookFrame activePath="/account">
      <section className="starbook-hero starbook-hero-immersive">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">ستاره‌ها و XP</span>
          <h1>امتیاز وفاداری تو.</h1>
          <p>ستاره‌ها، سطح، نشان و استریک فعلاً روی دستگاه تو هستند تا دفترکل مالی جدا ساخته نشود.</p>
        </div>
      </section>
      <StarBookReveal>
        <StarBookStudentHub />
      </StarBookReveal>
    </StarBookFrame>
  );
}
