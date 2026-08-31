export function DiscoverSearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form className="discover-search" action="/discover/search" method="get">
      <label htmlFor="discover-q">جستجو در دانشنامه انتخاب رشته</label>
      <div>
        <input
          id="discover-q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="رشته، نظام دانشگاهی، مقطع یا مسیر شغلی"
          autoComplete="off"
        />
        <button type="submit">جستجو</button>
      </div>
    </form>
  );
}
