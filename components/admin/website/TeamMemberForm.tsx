"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  uploadTeamPortraitAction,
  type TeamActionState,
} from "@/app/admin/(dashboard)/website/team/actions";

type DepartmentOption = { id: string; name: string };

type TeamMemberFormProps = {
  mode: "create" | "edit";
  departments: DepartmentOption[];
  member?: {
    id: string;
    fullName: string;
    roleTitle: string;
    departmentId: string;
    biography: string;
    specialty: string | null;
    email: string | null;
    phone: string | null;
    instagramUrl: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    displayOrder: number;
    featuredPriority: number;
    isActive: boolean;
    isFeatured: boolean;
    archivedAt: Date | null;
    portraitUrl: string | null;
  };
};

const initial: TeamActionState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm";

export function TeamMemberForm({
  mode,
  departments,
  member,
}: TeamMemberFormProps) {
  const action = mode === "create" ? createTeamMemberAction : updateTeamMemberAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [portraitState, portraitAction, portraitPending] = useActionState(
    uploadTeamPortraitAction,
    initial,
  );

  return (
    <div className="space-y-5">
      {state.formError || portraitState.formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.formError ?? portraitState.formError}
        </div>
      ) : null}
      {state.successMessage || portraitState.successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {state.successMessage ?? portraitState.successMessage}
        </div>
      ) : null}

      <form action={formAction} className="admin-card space-y-5 p-5 sm:p-6">
        {mode === "edit" && member ? (
          <input type="hidden" name="memberId" value={member.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">نام کامل</span>
            <input
              name="fullName"
              required
              defaultValue={member?.fullName ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">سمت / نقش</span>
            <input
              name="roleTitle"
              required
              defaultValue={member?.roleTitle ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">دپارتمان</span>
            <select
              name="departmentId"
              required
              defaultValue={member?.departmentId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب دپارتمان</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">تخصص</span>
            <input
              name="specialty"
              defaultValue={member?.specialty ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">بیوگرافی</span>
            <textarea
              name="biography"
              rows={5}
              defaultValue={member?.biography ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">ایمیل (اختیاری)</span>
            <input
              name="email"
              type="email"
              dir="ltr"
              defaultValue={member?.email ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">تلفن (اختیاری)</span>
            <input
              name="phone"
              dir="ltr"
              defaultValue={member?.phone ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">اینستاگرام</span>
            <input
              name="instagramUrl"
              dir="ltr"
              defaultValue={member?.instagramUrl ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">لینکدین</span>
            <input
              name="linkedinUrl"
              dir="ltr"
              defaultValue={member?.linkedinUrl ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">وب‌سایت</span>
            <input
              name="websiteUrl"
              dir="ltr"
              defaultValue={member?.websiteUrl ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">Slug</span>
            <input
              name="slug"
              dir="ltr"
              defaultValue={member?.slug ?? ""}
              className={inputClass}
              placeholder="auto-from-name"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">ترتیب نمایش</span>
            <input
              name="displayOrder"
              type="number"
              defaultValue={member?.displayOrder ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">اولویت صفحه اصلی</span>
            <input
              name="featuredPriority"
              type="number"
              defaultValue={member?.featuredPriority ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">عنوان SEO</span>
            <input
              name="seoTitle"
              defaultValue={member?.seoTitle ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">توضیح SEO</span>
            <textarea
              name="seoDescription"
              rows={2}
              defaultValue={member?.seoDescription ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={member?.isActive ?? true}
            />
            فعال
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isFeatured"
              value="true"
              defaultChecked={member?.isFeatured ?? false}
            />
            نمایش در صفحه اصلی
          </label>
          {mode === "edit" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={Boolean(member?.archivedAt)}
              />
              بایگانی
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "در حال ذخیره…" : mode === "create" ? "ثبت عضو" : "ذخیره تغییرات"}
          </button>
          <Link
            href="/admin/website/team"
            className="rounded-xl border border-border px-5 py-2.5 text-sm"
          >
            بازگشت
          </Link>
        </div>
      </form>

      {mode === "edit" && member ? (
        <form action={portraitAction} className="admin-card space-y-3 p-5">
          <input type="hidden" name="memberId" value={member.id} />
          <h2 className="font-semibold text-primary">تصویر پروفایل</h2>
          {member.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.portraitUrl}
              alt={member.fullName}
              className="h-36 w-36 rounded-2xl object-cover"
            />
          ) : (
            <p className="text-sm text-muted">هنوز تصویری بارگذاری نشده است.</p>
          )}
          <input
            type="file"
            name="portrait"
            accept="image/jpeg,image/png,image/webp"
          />
          <p className="text-xs text-muted">
            حداکثر ۲ مگابایت · JPEG / PNG / WebP · در صورت امکان به ابعاد وب
            بهینه‌سازی می‌شود.
          </p>
          <input
            name="altText"
            placeholder="متن جایگزین تصویر"
            defaultValue={member.fullName}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={portraitPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {portraitPending ? "در حال بارگذاری…" : "بارگذاری تصویر"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
