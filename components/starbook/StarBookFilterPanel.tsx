import Link from "next/link";

type StarBookFilterPanelProps = {
  grades: readonly string[];
  subjects: readonly string[];
  collections?: readonly { slug: string; title: string }[];
  q: string;
  grade: string;
  subject: string;
  sort: string;
  sale?: boolean;
  featured?: boolean;
  category?: string;
};

const SORTS = [
  { value: "featured", label: "پیشنهادی" },
  { value: "newest", label: "جدیدترین" },
  { value: "priceAsc", label: "ارزان‌تر" },
  { value: "priceDesc", label: "گران‌تر" },
] as const;

export function StarBookFilterPanel({
  grades,
  subjects,
  collections = [],
  q,
  grade,
  subject,
  sort,
  sale = false,
  featured = false,
  category = "",
}: StarBookFilterPanelProps) {
  return (
    <form action="/shop/browse" className="starbook-filters">
      <input
        name="q"
        defaultValue={q}
        placeholder="جستجو در عنوان، درس، مؤلف…"
        className="starbook-input"
      />
      <label className="block text-sm">
        <span className="mb-2 block text-[var(--sb-muted)]">پایه</span>
        <select name="grade" defaultValue={grade} className="starbook-select">
          <option value="">همه پایه‌ها</option>
          {grades.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-[var(--sb-muted)]">درس</span>
        <select name="subject" defaultValue={subject} className="starbook-select">
          <option value="">همه درس‌ها</option>
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      {collections.length > 0 ? (
        <label className="block text-sm">
          <span className="mb-2 block text-[var(--sb-muted)]">کالکشن</span>
          <select name="category" defaultValue={category} className="starbook-select">
            <option value="">همه قفسه‌ها</option>
            {collections.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <fieldset className="flex flex-wrap gap-2">
        {SORTS.map((item) => (
          <label key={item.value} className="starbook-chip cursor-pointer">
            <input
              type="radio"
              name="sort"
              value={item.value}
              defaultChecked={sort === item.value}
              className="sr-only"
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sale" value="1" defaultChecked={sale} />
        فقط حراج
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" value="1" defaultChecked={featured} />
        فقط ویژه تحریریه
      </label>
      <button type="submit" className="starbook-btn starbook-btn-primary w-full">
        اعمال فیلتر
      </button>
      <Link href="/shop/browse" className="starbook-btn starbook-btn-ghost w-full">
        پاک کردن
      </Link>
    </form>
  );
}
