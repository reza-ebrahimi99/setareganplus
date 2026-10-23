import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageTitle } from "@/components/admin/ui";

export default async function Centers() {
  const centers = await prisma.center.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageTitle title="مراکز" sub="محتوای صفحه‌های /education و /ghalamchi" />
      <div className="grid gap-4 md:grid-cols-2">
        {centers.map((c) => (
          <Link key={c.id} href={`/admin/centers/${c.slug}`} className={`rounded-2xl border bg-paper p-6 hover:shadow-sm ${c.slug === "ghalamchi" ? "border-gc/30" : "border-edu/30"}`}>
            <span className={`block h-1 w-10 rounded-full ${c.slug === "ghalamchi" ? "bg-gc" : "bg-edu"}`} />
            <p className="mt-4 text-lg font-extrabold text-navy">{c.name}</p>
            <p className="mt-1 text-sm text-muted" dir="ltr">/{c.slug}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
