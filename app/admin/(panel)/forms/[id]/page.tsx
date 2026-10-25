import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerm, can, logAction } from "@/lib/auth";
import { parseFields, FIELD_TYPES, OPTION_TYPES, PRICE_TYPES, optionsOf, type FieldDef } from "@/lib/forms/types";
import { THEMES } from "@/lib/forms/themes";
import { RESERVED_SLUGS } from "@/lib/forms/public";
import { slugify } from "@/lib/format";
import { saveImage } from "@/lib/uploads";
import { FormBuilder, type BuilderPayload, type BuilderDiscount } from "@/components/admin/FormBuilder";

const MAX_TOMAN = 1_000_000_000; // 1e9 toman: sanity cap
const intOrNull = (v: unknown, max: number) => {
  const x = typeof v === "number" ? Math.trunc(v) : Number.NaN;
  return Number.isFinite(x) && x > 0 ? Math.min(x, max) : null;
};
const isoOrNull = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const safeUrl = (u: string, allowExternal = true) => {
  const t = u.trim();
  if (!t) return null;
  if (t.startsWith("/") && !t.startsWith("//") && !t.includes("\\")) return t;
  if (allowExternal && /^https:\/\/[^\s/]+\.[^\s]+$/i.test(t)) return t;
  return undefined; // invalid
};
const mediaOrNull = (u: string) => (u && /^\/media\/[\w./-]+$/.test(u) && !u.includes("..") ? u : null);

function toDiscounts(rows: { id: string; code: string; percent: number | null; amountRials: number | null; maxUses: number | null; used: number; active: boolean; expiresAt: Date | null }[]): BuilderDiscount[] {
  return rows.map((d) => ({ id: d.id, code: d.code, percent: d.percent, amountToman: d.amountRials ? d.amountRials / 10 : null, maxUses: d.maxUses, used: d.used, active: d.active, expiresAt: d.expiresAt?.toISOString() ?? null }));
}

export default async function FormEdit({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("forms.builder");
  const { id } = await params;
  const f = await prisma.form.findUnique({ where: { id }, include: { _count: { select: { submissions: true } }, discounts: { orderBy: { createdAt: "asc" } } } });
  if (!f) notFound();

  async function upload(fd: FormData): Promise<{ url?: string; error?: string }> {
    "use server";
    await requirePerm("forms.builder");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "فایلی انتخاب نشده است." };
    if (file.size > 8 * 1024 * 1024) return { error: "حداکثر حجم تصویر ۸ مگابایت است." };
    if (!file.type.startsWith("image/")) return { error: "فقط تصویر مجاز است." };
    try {
      return { url: await saveImage(file, "forms", 1920) };
    } catch {
      return { error: "تصویر قابل پردازش نیست." };
    }
  }

  async function save(p: BuilderPayload): Promise<{ ok: boolean; error?: string; discounts?: BuilderDiscount[] }> {
    "use server";
    const me = await requirePerm("forms.builder");
    if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(p.status)) return { ok: false, error: "وضعیت نامعتبر است." };
    const valid = new Set<string>(FIELD_TYPES.map((t) => t.type));
    const ids = new Set<string>();
    const fields: FieldDef[] = [];
    for (const x of p.fields) {
      if (!valid.has(x.type) || !x.id || typeof x.id !== "string" || ids.has(x.id)) return { ok: false, error: "ساختار فیلدها نامعتبر است." };
      if (!String(x.label ?? "").trim() && x.type !== "image") return { ok: false, error: "همه فیلدها باید عنوان داشته باشند." };
      if (["select", "radio"].includes(x.type) && !(x.options ?? []).filter((o) => o.trim()).length) return { ok: false, error: `برای «${x.label}» حداقل یک گزینه لازم است.` };
      if (x.type === "image" && !mediaOrNull(x.src ?? "")) return { ok: false, error: "برای بلوک تصویر، یک تصویر بارگذاری کنید." };
      let href: string | undefined;
      if (x.type === "consent" && x.href?.trim()) {
        const u = safeUrl(x.href);
        if (!u) return { ok: false, error: "پیوند قوانین باید با / یا https:// شروع شود." };
        href = u;
      }
      ids.add(x.id);
      const options = OPTION_TYPES.includes(x.type) ? x.options?.map((o) => o.trim()).filter(Boolean) : undefined;
      let prices: Record<string, number> | undefined;
      if (PRICE_TYPES.includes(x.type) && x.prices) {
        const allowed = new Set(optionsOf({ type: x.type, options }));
        prices = {};
        for (const [o, r] of Object.entries(x.prices)) {
          const v = Math.trunc(Number(r));
          if (allowed.has(o) && Number.isFinite(v) && v > 0) prices[o] = Math.min(v, MAX_TOMAN * 10);
        }
        if (!Object.keys(prices).length) prices = undefined;
      }
      fields.push({
        id: x.id.slice(0, 40),
        type: x.type,
        label: String(x.label ?? "").trim().slice(0, 300),
        help: x.help?.trim().slice(0, 2000) || undefined,
        placeholder: x.placeholder?.trim().slice(0, 200) || undefined,
        required: x.type === "section" || x.type === "image" || x.type === "page" ? false : !!x.required,
        half: !!x.half,
        options,
        showIf: x.showIf?.field && x.showIf.equals ? { field: String(x.showIf.field), equals: String(x.showIf.equals) } : null,
        ...(prices ? { prices } : {}),
        ...(x.type === "image" ? { src: mediaOrNull(x.src ?? "")! } : {}),
        ...(href ? { href } : {}),
      });
    }
    const slug = slugify(p.slug);
    const cur = await prisma.form.findUnique({ where: { id } });
    if (!cur) return { ok: false, error: "فرم پیدا نشد." };
    if (!cur.isSystem) {
      if (!slug) return { ok: false, error: "نامک لازم است." };
      if (RESERVED_SLUGS.includes(slug)) return { ok: false, error: "این نامک رزرو است؛ نامک دیگری انتخاب کنید." };
      const clash = await prisma.form.findFirst({ where: { slug, NOT: { id } } });
      if (clash) return { ok: false, error: "این نامک قبلاً استفاده شده است." };
    }
    if (!THEMES.some((t) => t.key === p.theme)) return { ok: false, error: "تم نامعتبر است." };
    if (!["NONE", "MOBILE", "NATIONAL_CODE"].includes(p.uniqueBy)) return { ok: false, error: "تنظیم تکرار نامعتبر است." };
    if (!["FREE", "FIXED", "OPTIONS"].includes(p.payMode)) return { ok: false, error: "نوع پرداخت نامعتبر است." };
    const base = intOrNull(p.basePriceToman, MAX_TOMAN) ?? 0;
    if (p.payMode === "FIXED" && base < 1000) return { ok: false, error: "برای مبلغ ثابت، هزینهٔ ثبت‌نام را (حداقل ۱٬۰۰۰ تومان) وارد کنید." };
    if (p.payMode === "OPTIONS" && base === 0 && !fields.some((x) => x.prices && Object.keys(x.prices).length)) return { ok: false, error: "برای «قیمت با گزینه»، حداقل برای یک گزینه قیمت تعیین کنید." };
    const opensAt = isoOrNull(p.opensAt);
    const closesAt = isoOrNull(p.closesAt);
    if (opensAt && closesAt && closesAt <= opensAt) return { ok: false, error: "پایان ثبت‌نام باید بعد از شروع آن باشد." };
    const redirectTo = safeUrl(p.successRedirect ?? "");
    if (redirectTo === undefined) return { ok: false, error: "نشانی انتقال باید با / یا https:// شروع شود." };
    if (p.uniqueBy === "MOBILE" && !fields.some((x) => x.type === "phone")) return { ok: false, error: "برای «یک‌بار با هر موبایل»، فیلد شماره موبایل لازم است." };
    if (p.uniqueBy === "NATIONAL_CODE" && !fields.some((x) => x.type === "nationalCode")) return { ok: false, error: "برای «یک‌بار با هر کد ملی»، فیلد کد ملی لازم است." };

    // discounts
    const codes = new Set<string>();
    const disc: { id?: string; code: string; percent: number | null; amountRials: number | null; maxUses: number | null; active: boolean; expiresAt: Date | null }[] = [];
    for (const d of p.discounts ?? []) {
      const code = String(d.code ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
      if (!code) return { ok: false, error: "کد تخفیف خالی است." };
      if (codes.has(code)) return { ok: false, error: `کد تخفیف «${code}» تکراری است.` };
      codes.add(code);
      const percent = intOrNull(d.percent, 100);
      const amountRials = intOrNull(d.amountToman, MAX_TOMAN) ? intOrNull(d.amountToman, MAX_TOMAN)! * 10 : null;
      if (!percent && !amountRials) return { ok: false, error: `برای کد «${code}» درصد یا مبلغ تخفیف لازم است.` };
      disc.push({ id: typeof d.id === "string" ? d.id : undefined, code, percent, amountRials, maxUses: intOrNull(d.maxUses, 1_000_000), active: !!d.active, expiresAt: isoOrNull(d.expiresAt) });
    }

    await prisma.$transaction(async (tx) => {
      await tx.form.update({
        where: { id },
        data: {
          title: p.title.trim().slice(0, 200) || "فرم",
          slug: cur.isSystem ? cur.slug : slug,
          description: p.description.trim() || null,
          status: p.status,
          submitLabel: p.submitLabel.trim().slice(0, 60) || "ارسال",
          successMessage: p.successMessage.trim().slice(0, 1000) || "ثبت شد.",
          fields,
          coverImage: mediaOrNull(p.coverImage),
          logo: mediaOrNull(p.logo),
          theme: p.theme,
          listed: !!p.listed,
          opensAt,
          closesAt,
          capacity: intOrNull(p.capacity, 1_000_000),
          uniqueBy: p.uniqueBy,
          successTitle: p.successTitle.trim().slice(0, 120) || null,
          successRedirect: redirectTo,
          smsConfirm: !!p.smsConfirm,
          adminNotify: !!p.adminNotify,
          payMode: p.payMode,
          basePriceRials: p.payMode === "FREE" ? 0 : base * 10,
        },
      });
      const keep = disc.filter((d) => d.id).map((d) => d.id!);
      await tx.formDiscount.deleteMany({ where: { formId: id, id: { notIn: keep } } });
      for (const d of disc) {
        const { id: did, ...data } = d;
        if (did) await tx.formDiscount.updateMany({ where: { id: did, formId: id }, data });
        else await tx.formDiscount.create({ data: { ...data, formId: id } });
      }
    });
    await logAction(me, "form.save", `ذخیرهٔ فرم «${p.title.trim()}»`, id);
    revalidatePath("/forms");
    revalidatePath(`/f/${cur.slug}`);
    const rows = await prisma.formDiscount.findMany({ where: { formId: id }, orderBy: { createdAt: "asc" } });
    return { ok: true, discounts: toDiscounts(rows) };
  }
  async function remove() {
    "use server";
    const me = await requirePerm("forms.builder");
    const cur = await prisma.form.findUnique({ where: { id } });
    if (!cur || cur.isSystem) return;
    await prisma.form.delete({ where: { id } });
    await logAction(me, "form.delete", `حذف فرم «${cur.title}»`, id);
    redirect("/admin/forms");
  }

  return (
    <FormBuilder
      id={f.id}
      isSystem={f.isSystem}
      submissions={f._count.submissions}
      canPayments={can(me, "forms.payments")}
      initial={{
        title: f.title,
        slug: f.slug,
        description: f.description ?? "",
        status: f.status,
        submitLabel: f.submitLabel,
        successMessage: f.successMessage,
        fields: parseFields(f.fields),
        coverImage: f.coverImage ?? "",
        logo: f.logo ?? "",
        theme: f.theme,
        listed: f.listed,
        opensAt: f.opensAt?.toISOString() ?? null,
        closesAt: f.closesAt?.toISOString() ?? null,
        capacity: f.capacity,
        uniqueBy: f.uniqueBy as BuilderPayload["uniqueBy"],
        successTitle: f.successTitle ?? "",
        successRedirect: f.successRedirect ?? "",
        smsConfirm: f.smsConfirm,
        adminNotify: f.adminNotify,
        payMode: f.payMode as BuilderPayload["payMode"],
        basePriceToman: Math.round(f.basePriceRials / 10),
        discounts: toDiscounts(f.discounts),
      }}
      save={save}
      upload={upload}
      remove={f.isSystem ? undefined : remove}
    />
  );
}
