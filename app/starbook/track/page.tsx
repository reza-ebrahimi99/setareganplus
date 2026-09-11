import { StarBookShell } from "@/components/starbook/StarBookShell";
import { StarBookTrackForm } from "@/components/starbook/StarBookTrackForm";

export default function StarBookTrackPage() {
  return (
    <StarBookShell activePath="/account">
      <section className="starbook-hero">
        <span className="starbook-kicker">پیگیری</span>
        <h1>سفارشت کجاست؟</h1>
        <p>کد کوتاه پیامک یا لینک QR را وارد کن تا رسید تحویل باز شود.</p>
      </section>
      <section className="starbook-section">
        <div className="starbook-panel max-w-lg">
          <StarBookTrackForm />
        </div>
      </section>
    </StarBookShell>
  );
}
