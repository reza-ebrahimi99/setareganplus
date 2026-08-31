import type { DiscoverFaq as Faq } from "@/lib/guidance/discover/types";

export function DiscoverFaq({ items }: { items: readonly Faq[] }) {
  if (items.length === 0) return null;
  return (
    <section className="discover-faq">
      <h2>پرسش‌های پرتکرار</h2>
      <dl>
        {items.map((item) => (
          <div key={item.question}>
            <dt>{item.question}</dt>
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
