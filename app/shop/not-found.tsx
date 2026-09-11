import Link from "next/link";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import { StarBookMagnetic } from "@/components/starbook/StarBookMotion";

export default function StarBookNotFound() {
  return (
    <StarBookFrame activePath="/shop">
      <section className="starbook-hero starbook-hero-immersive relative overflow-hidden">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">۴۰۴ · گم شدی؟ عالیه</span>
          <h1>این قفسه توی کهکشان ما نیست.</h1>
          <p>
            شاید کتاب جابه‌جا شده، یا آدرس را کمی فضایی نوشتی. برگرد به خانه و یک پلی‌لیست تازه
            بردار — XP استریکت هنوز زنده‌ست.
          </p>
          <div className="starbook-cta-row">
            <StarBookMagnetic href="/shop">پرتاب به خانه</StarBookMagnetic>
            <Link href="/shop/browse" className="starbook-btn starbook-btn-ghost">
              کشف تصادفی
            </Link>
          </div>
        </div>
      </section>
    </StarBookFrame>
  );
}
