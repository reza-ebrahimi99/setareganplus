import {
  duplicateSectionAction,
  moveSectionAction,
  softDeleteSectionAction,
  updateSectionStatusAction,
} from "@/app/admin/(dashboard)/website/pages/actions";
import { SectionEditor } from "@/components/admin/website/page-builder/SectionEditor";
import type { AdminWebsitePageSection } from "@/lib/website/page-builder/pages-admin";
import { toPersianDigits } from "@/lib/persian";

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  DISABLED: "غیرفعال",
};

export function SectionList({
  sections,
}: {
  sections: AdminWebsitePageSection[];
}) {
  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted">
        هنوز بخشی اضافه نشده است.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {sections.map((section, index) => (
        <li key={section.id} className="admin-card space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                {toPersianDigits(String(index + 1))}. {section.typeLabelFa}
              </p>
              <p className="mt-1 text-xs text-muted">
                وضعیت: {statusLabel[section.status] ?? section.status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={moveSectionAction}>
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={index === 0}
                  className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs disabled:opacity-40"
                >
                  بالا
                </button>
              </form>
              <form action={moveSectionAction}>
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={index === sections.length - 1}
                  className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs disabled:opacity-40"
                >
                  پایین
                </button>
              </form>
              <form action={duplicateSectionAction}>
                <input type="hidden" name="sectionId" value={section.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs"
                >
                  تکثیر
                </button>
              </form>
              <form action={softDeleteSectionAction}>
                <input type="hidden" name="sectionId" value={section.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800"
                >
                  حذف
                </button>
              </form>
            </div>
          </div>

          <form action={updateSectionStatusAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="sectionId" value={section.id} />
            <label className="block text-xs">
              <span className="mb-1 block text-muted">تغییر سریع وضعیت</span>
              <select
                name="status"
                defaultValue={section.status}
                className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5"
              >
                <option value="DRAFT">پیش‌نویس</option>
                <option value="PUBLISHED">منتشرشده</option>
                <option value="DISABLED">غیرفعال</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs"
            >
              اعمال
            </button>
          </form>

          <SectionEditor section={section} />
        </li>
      ))}
    </ul>
  );
}
