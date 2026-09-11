import Link from "next/link";
import { StarBookSavedOrders } from "@/components/starbook/StarBookAccountExtras";
import { StarBookShell } from "@/components/starbook/StarBookShell";

export default function StarBookOrdersPage() {
  return (
    <StarBookShell activePath="/account">
      <section className="starbook-hero">
        <span className="starbook-kicker">سفارش‌ها</span>
        <h1>کدهایی که نگه داشتی.</h1>
        <p>پرداخت موفق از درگاه می‌آید؛ اینجا فقط میانبر کد کوتاه است.</p>
      </section>
      <section className="starbook-section">
        <div className="starbook-panel space-y-4">
          <StarBookSavedOrders />
          <Link href="/track" className="starbook-btn starbook-btn-primary">
            افزودن کد تازه
          </Link>
        </div>
      </section>
    </StarBookShell>
  );
}
