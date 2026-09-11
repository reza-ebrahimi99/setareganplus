import { StarBookAddressBook } from "@/components/starbook/StarBookAccountExtras";
import { StarBookShell } from "@/components/starbook/StarBookShell";

export default function StarBookAddressesPage() {
  return (
    <StarBookShell activePath="/shop/account">
      <section className="starbook-hero">
        <span className="starbook-kicker">آدرس</span>
        <h1>شعبه مال تو.</h1>
      </section>
      <section className="starbook-section max-w-xl">
        <StarBookAddressBook />
      </section>
    </StarBookShell>
  );
}
