import { StarBookNotificationList } from "@/components/starbook/StarBookAccountExtras";
import { StarBookShell } from "@/components/starbook/StarBookShell";

export default function StarBookNotificationsPage() {
  return (
    <StarBookShell activePath="/account">
      <section className="starbook-hero">
        <span className="starbook-kicker">اعلان</span>
        <h1>چیزهایی که نباید از دست بدهی.</h1>
      </section>
      <section className="starbook-section max-w-xl">
        <StarBookNotificationList />
      </section>
    </StarBookShell>
  );
}
