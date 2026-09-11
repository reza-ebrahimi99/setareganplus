import Link from "next/link";
import { StarBookShell } from "@/components/starbook/StarBookShell";

const MAJORS = [
  { q: "ریاضی", title: "ریاضی", tone: "exam" },
  { q: "تجربی", title: "تجربی", tone: "flash" },
  { q: "انسانی", title: "انسانی", tone: "new" },
] as const;

export default function StarBookMajorPage() {
  return (
    <StarBookShell activePath="/browse">
      <section className="starbook-hero">
        <span className="starbook-kicker">رشته</span>
        <h1>مسیر خودت را انتخاب کن.</h1>
      </section>
      <section className="starbook-section starbook-mosaic">
        {MAJORS.map((major) => (
          <Link
            key={major.q}
            href={`/browse?q=${encodeURIComponent(major.q)}`}
            className="starbook-tile"
            data-tone={major.tone}
          >
            <h3>{major.title}</h3>
            <p className="mt-2 text-sm text-[var(--sb-muted)]">ورود به قفسه {major.title}</p>
          </Link>
        ))}
      </section>
    </StarBookShell>
  );
}
