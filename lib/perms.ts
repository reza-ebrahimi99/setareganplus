// Admin permission keys. Shared by server (enforcement) and client (sidebar / staff form).

export const PERM_GROUPS = [
  {
    title: "فروشگاه جزوه",
    perms: [
      { key: "shop.dashboard", label: "داشبورد فروش و گزارش‌ها", hint: "آمار فروش، نمودارها" },
      { key: "shop.orders.view", label: "دیدن سفارش‌ها", hint: "فهرست و جزئیات سفارش، خروجی اکسل" },
      { key: "shop.orders.edit", label: "ویرایش سفارش‌ها", hint: "تغییر وضعیت، یادداشت، ثبت دستی، پیامک، استعلام زیبال" },
      { key: "shop.pickup", label: "تحویل حضوری (اسکن کد)", hint: "جست‌وجو با کد رسید و ثبت تحویل" },
      { key: "shop.labels", label: "برچسب و چاپ", hint: "چاپ برچسب سفارش‌ها" },
      { key: "shop.products", label: "جزوه‌ها و قیمت‌ها", hint: "افزودن/ویرایش جزوه، قیمت، موجودی" },
      { key: "shop.settings", label: "تنظیمات فروشگاه", hint: "باز/بسته بودن فروش، متن‌ها" },
    ],
  },
  {
    title: "فرم‌ها و درخواست‌ها",
    perms: [
      { key: "forms.builder", label: "فرم‌ساز", hint: "ساخت و ویرایش فرم‌ها" },
      { key: "submissions", label: "درخواست‌های ثبت‌شده", hint: "دیدن، تغییر وضعیت، خروجی اکسل و فایل‌های پیوست" },
      { key: "forms.payments", label: "پرداخت‌های فرم‌ها", hint: "مبلغ، کد پیگیری زیبال، جمع درآمد هر فرم و ستون‌های پرداخت در خروجی" },
    ],
  },
  {
    title: "محتوای سایت",
    perms: [
      { key: "content.centers", label: "مراکز", hint: "صفحهٔ آموزشگاه و نمایندگی قلم‌چی" },
      { key: "content.team", label: "تیم", hint: "معرفی همکاران در سایت" },
      { key: "content.achievements", label: "افتخارات", hint: "رتبه‌ها و قبولی‌ها" },
      { key: "content.gallery", label: "گالری", hint: "آلبوم‌ها و عکس‌ها" },
      { key: "content.faq", label: "سؤالات متداول", hint: "" },
      { key: "content.news", label: "اخبار و اطلاعیه‌ها", hint: "نوشتن، انتشار و سنجاق کردن خبر و اطلاعیه" },
      { key: "site.settings", label: "تنظیمات سایت", hint: "تلفن، آدرس، آمار، متن‌های صفحهٔ اصلی" },
    ],
  },
  {
    title: "مدیریت",
    perms: [{ key: "users.manage", label: "مدیریت همکاران", hint: "فقط مدیر اصلی می‌تواند این دسترسی را بدهد", ownerOnly: true }],
  },
] as const;

export type Perm = (typeof PERM_GROUPS)[number]["perms"][number]["key"];
export const ALL_PERMS: Perm[] = PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.key as Perm));
export const PERM_LABEL: Record<string, string> = Object.fromEntries(PERM_GROUPS.flatMap((g) => g.perms.map((p) => [p.key, p.label])));
export const isPerm = (k: string): k is Perm => (ALL_PERMS as string[]).includes(k);

export const PRESETS: { key: string; label: string; perms: Perm[] }[] = [
  { key: "pickup", label: "مسئول تحویل جزوه", perms: ["shop.pickup", "shop.orders.view", "shop.labels"] },
  { key: "shop", label: "فروشگاه کامل", perms: ["shop.dashboard", "shop.orders.view", "shop.orders.edit", "shop.pickup", "shop.labels", "shop.products", "shop.settings"] },
  { key: "forms", label: "فقط فرم‌ها", perms: ["forms.builder", "submissions", "forms.payments"] },
  { key: "reception", label: "پذیرش (درخواست‌ها)", perms: ["submissions"] },
  { key: "content", label: "محتوای سایت", perms: ["content.centers", "content.team", "content.achievements", "content.gallery", "content.faq", "content.news"] },
];

/** Admin route -> required permission (longest prefix wins). Used by the sidebar and the dashboard. */
export const ROUTE_PERM: [string, Perm | null][] = [
  ["/admin/submissions", "submissions"],
  ["/admin/forms", "forms.builder"],
  ["/admin/shop/orders", "shop.orders.view"],
  ["/admin/shop/pickup", "shop.pickup"],
  ["/admin/shop/products", "shop.products"],
  ["/admin/shop/settings", "shop.settings"],
  ["/admin/shop", "shop.dashboard"],
  ["/admin/labels", "shop.labels"],
  ["/admin/centers", "content.centers"],
  ["/admin/team", "content.team"],
  ["/admin/achievements", "content.achievements"],
  ["/admin/gallery", "content.gallery"],
  ["/admin/faq", "content.faq"],
  ["/admin/news", "content.news"],
  ["/admin/settings", "site.settings"],
  ["/admin/users", "users.manage"],
];

export function permForPath(path: string): Perm | null {
  const hit = ROUTE_PERM.filter(([p]) => path === p || path.startsWith(p + "/")).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : null;
}
