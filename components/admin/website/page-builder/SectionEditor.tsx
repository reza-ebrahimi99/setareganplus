"use client";

import { useActionState, useState } from "react";
import {
  updateSectionAction,
  type PageBuilderActionState,
} from "@/app/admin/(dashboard)/website/pages/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import type { AdminWebsitePageSection } from "@/lib/website/page-builder/pages-admin";
import type {
  CtaSectionConfig,
  HeroSectionConfig,
  ImageSectionConfig,
  RichTextSectionConfig,
  SpacerSectionConfig,
} from "@/lib/website/page-builder/types";

const emptyState: PageBuilderActionState = {};

function mediaForRole(
  section: AdminWebsitePageSection,
  role: string,
) {
  return section.media.find((m) => m.role === role);
}

function ButtonFields({
  prefix,
  label,
  defaults,
}: {
  prefix: string;
  label: string;
  defaults?: { label: string; href: string };
}) {
  return (
    <fieldset className="space-y-2 rounded-xl border border-border p-3">
      <legend className="px-1 text-sm text-muted">{label}</legend>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">متن دکمه</span>
        <input
          name={`${prefix}Label`}
          defaultValue={defaults?.label ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">پیوند</span>
        <input
          name={`${prefix}Href`}
          defaultValue={defaults?.href ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          dir="ltr"
        />
      </label>
    </fieldset>
  );
}

export function SectionEditor({ section }: { section: AdminWebsitePageSection }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    updateSectionAction,
    emptyState,
  );

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-primary"
      >
        {open ? "بستن ویرایشگر" : "ویرایش پیکربندی"}
      </button>

      {open ? (
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="sectionId" value={section.id} />

          {state.formError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {state.formError}
            </div>
          ) : null}
          {state.successMessage ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              {state.successMessage}
            </div>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">وضعیت بخش</span>
            <select
              name="status"
              defaultValue={section.status}
              className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
            >
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشرشده</option>
              <option value="DISABLED">غیرفعال</option>
            </select>
          </label>

          {section.type === "HERO" ? (
            <HeroFields
              config={section.config as HeroSectionConfig}
              section={section}
            />
          ) : null}
          {section.type === "IMAGE" ? (
            <ImageFields
              config={section.config as ImageSectionConfig}
              section={section}
            />
          ) : null}
          {section.type === "RICH_TEXT" ? (
            <RichTextFields config={section.config as RichTextSectionConfig} />
          ) : null}
          {section.type === "CTA" ? (
            <CtaFields
              config={section.config as CtaSectionConfig}
              section={section}
            />
          ) : null}
          {section.type === "SPACER" ? (
            <SpacerFields config={section.config as SpacerSectionConfig} />
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "در حال ذخیره…" : "ذخیره بخش"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function HeroFields({
  config,
  section,
}: {
  config: HeroSectionConfig;
  section: AdminWebsitePageSection;
}) {
  const primary = mediaForRole(section, "primary");
  const mobile = mediaForRole(section, "mobile");

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">ابرو (اختیاری)</span>
        <input
          name="eyebrow"
          defaultValue={config.eyebrow ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان</span>
        <input
          name="headline"
          defaultValue={config.headline}
          required
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">زیرعنوان</span>
        <textarea
          name="subheadline"
          defaultValue={config.subheadline ?? ""}
          rows={2}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">چینش</span>
          <select name="align" defaultValue={config.align} className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full">
            <option value="start">شروع</option>
            <option value="center">وسط</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">پوشش</span>
          <select
            name="overlay"
            defaultValue={config.overlay}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          >
            <option value="none">بدون پوشش</option>
            <option value="soft">نرم</option>
            <option value="strong">قوی</option>
          </select>
        </label>
      </div>
      <ButtonFields
        prefix="primaryCta"
        label="دکمه اصلی"
        defaults={config.primaryCta}
      />
      <ButtonFields
        prefix="secondaryCta"
        label="دکمه فرعی"
        defaults={config.secondaryCta}
      />
      <MediaPickerField
        name="mediaRole_primary"
        label="تصویر اصلی"
        value={primary?.mediaId}
        previewUrl={primary?.url}
        previewTitle={primary?.title}
      />
      <MediaPickerField
        name="mediaRole_mobile"
        label="تصویر موبایل (اختیاری)"
        value={mobile?.mediaId}
        previewUrl={mobile?.url}
        previewTitle={mobile?.title}
      />
    </div>
  );
}

function ImageFields({
  config,
  section,
}: {
  config: ImageSectionConfig;
  section: AdminWebsitePageSection;
}) {
  const primary = mediaForRole(section, "primary");
  return (
    <div className="space-y-3">
      <MediaPickerField
        name="mediaRole_primary"
        label="تصویر"
        value={primary?.mediaId}
        previewUrl={primary?.url}
        previewTitle={primary?.title}
      />
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">متن جایگزین (اختیاری)</span>
        <input
          name="altOverride"
          defaultValue={config.altOverride ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان تصویر</span>
        <input
          name="caption"
          defaultValue={config.caption ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">نسبت</span>
          <select name="aspect" defaultValue={config.aspect} className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full">
            <option value="auto">خودکار</option>
            <option value="16/9">۱۶/۹</option>
            <option value="4/3">۴/۳</option>
            <option value="1/1">۱/۱</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">برش</span>
          <select
            name="objectFit"
            defaultValue={config.objectFit}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          >
            <option value="cover">پوشش</option>
            <option value="contain">جا شدن</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">پیوند (اختیاری)</span>
        <input
          name="linkHref"
          defaultValue={config.linkHref ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          dir="ltr"
        />
      </label>
    </div>
  );
}

function RichTextFields({ config }: { config: RichTextSectionConfig }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان (اختیاری)</span>
        <input
          name="title"
          defaultValue={config.title ?? ""}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">متن</span>
        <textarea
          name="body"
          defaultValue={config.body}
          required
          rows={8}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
        <span className="mt-1 block text-xs text-muted">
          HTML مجاز نیست؛ خطوط جدید حفظ می‌شوند.
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">چینش</span>
          <select
            name="textAlign"
            defaultValue={config.textAlign}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          >
            <option value="start">شروع</option>
            <option value="center">وسط</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عرض</span>
          <select
            name="maxWidth"
            defaultValue={config.maxWidth}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          >
            <option value="prose">متن</option>
            <option value="wide">عریض</option>
            <option value="full">کامل</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function CtaFields({
  config,
  section,
}: {
  config: CtaSectionConfig;
  section: AdminWebsitePageSection;
}) {
  const background = mediaForRole(section, "background");
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان</span>
        <input
          name="title"
          defaultValue={config.title}
          required
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیح</span>
        <textarea
          name="description"
          defaultValue={config.description ?? ""}
          rows={3}
          className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">چینش</span>
        <select name="align" defaultValue={config.align} className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full">
          <option value="start">شروع</option>
          <option value="center">وسط</option>
        </select>
      </label>
      <ButtonFields
        prefix="primaryCta"
        label="دکمه اصلی"
        defaults={config.primaryCta}
      />
      <ButtonFields
        prefix="secondaryCta"
        label="دکمه فرعی"
        defaults={config.secondaryCta}
      />
      <MediaPickerField
        name="mediaRole_background"
        label="تصویر پس‌زمینه (اختیاری)"
        value={background?.mediaId}
        previewUrl={background?.url}
        previewTitle={background?.title}
      />
    </div>
  );
}

function SpacerFields({ config }: { config: SpacerSectionConfig }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">اندازه</span>
      <select name="size" defaultValue={config.size} className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full">
        <option value="sm">کوچک</option>
        <option value="md">متوسط</option>
        <option value="lg">بزرگ</option>
        <option value="xl">خیلی بزرگ</option>
      </select>
    </label>
  );
}
