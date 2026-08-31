import type { DiscoverInsight } from "@/lib/guidance/discover/types";

export function DiscoverInsight({ insight }: { insight: DiscoverInsight }) {
  return (
    <section className="discover-insight" aria-labelledby="counselor-insight">
      <p className="discover-insight__kicker">نظر مشاور مسئول</p>
      <h2 id="counselor-insight">نظر مهندس رضا ابراهیمی</h2>
      <p className="discover-insight__note">
        این بخش راهنمایی کیفی است — نه آمار رسمی و نه توصیه قطعی برای پرونده شما.
      </p>
      <dl>
        <div>
          <dt>خطای رایج دانش‌آموز</dt>
          <dd>{insight.mistakes}</dd>
        </div>
        <div>
          <dt>چه کسی معمولاً در این مسیر می‌ماند</dt>
          <dd>{insight.succeeds}</dd>
        </div>
        <div>
          <dt>خانواده باید بداند</dt>
          <dd>{insight.families}</dd>
        </div>
        <div>
          <dt>قبل از انتخاب</dt>
          <dd>{insight.before}</dd>
        </div>
      </dl>
    </section>
  );
}
