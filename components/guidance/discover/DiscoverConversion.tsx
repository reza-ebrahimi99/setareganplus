import Link from "next/link";
import {
  MAJOR_OFFICE_HOME,
  MAJOR_OFFICE_INTEREST,
} from "@/lib/guidance/office/nav";
import { ASSESSMENT_RESULTS_CTA_HREF } from "@/lib/guidance/journey/assessment/scoring";
import type { DiscoveryVisitor } from "@/lib/guidance/discover/visitor";

export function DiscoverConversion({ visitor }: { visitor: DiscoveryVisitor }) {
  return (
    <section className="discover-convert" aria-labelledby="discover-convert-title">
      <p className="discover-convert__kicker">گام بعدی</p>
      <h2 id="discover-convert-title">هنوز مطمئن نیستید؟</h2>
      <p>
        دانشنامه جای مشورت مهندس رضا ابراهیمی را نمی‌گیرد. انتخاب نهایی با رتبه،
        کارنامه و خانواده در جلسه بسته می‌شود.
      </p>
      <div className="discover-convert__actions">
        <Link href={ASSESSMENT_RESULTS_CTA_HREF} className="discover-convert__cta">
          رزرو جلسه تحلیل تخصصی
        </Link>
        {visitor.interestDone ? null : (
          <Link
            href={visitor.signedIn ? MAJOR_OFFICE_INTEREST : "/guidance"}
            className="discover-convert__ghost"
          >
            انجام آزمون رغبت‌سنجی رایگان
          </Link>
        )}
        {visitor.signedIn ? (
          <Link href={MAJOR_OFFICE_HOME} className="discover-convert__ghost">
            ادامه پرونده انتخاب رشته
          </Link>
        ) : (
          <Link href="/guidance" className="discover-convert__ghost">
            ورود به دفتر انتخاب رشته
          </Link>
        )}
      </div>
    </section>
  );
}
