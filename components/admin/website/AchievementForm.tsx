"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createAchievement,
  updateAchievement,
  uploadCertificate,
  uploadCover,
  type AchievementActionState,
} from "@/app/admin/(dashboard)/website/achievements/actions";

type Option = { id: string; name: string };

type AchievementFormProps = {
  mode: "create" | "edit";
  students: Array<{ id: string; name: string; gradeName: string }>;
  categories: Option[];
  achievement?: {
    id: string;
    studentId: string;
    categoryId: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string;
    achievementDate: string;
    schoolYear: string | null;
    issuer: string | null;
    level: string | null;
    place: string | null;
    score: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    displayOrder: number;
    featuredPriority: number;
    isFeatured: boolean;
    isPublished: boolean;
    archivedAt: Date | null;
    coverUrl: string | null;
    certificateUrl: string | null;
  };
};

const initial: AchievementActionState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm";

export function AchievementForm({
  mode,
  students,
  categories,
  achievement,
}: AchievementFormProps) {
  const action = mode === "create" ? createAchievement : updateAchievement;
  const [state, formAction, pending] = useActionState(action, initial);
  const [coverState, coverAction, coverPending] = useActionState(
    uploadCover,
    initial,
  );
  const [certState, certAction, certPending] = useActionState(
    uploadCertificate,
    initial,
  );

  return (
    <div className="space-y-5">
      {state.formError || coverState.formError || certState.formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.formError ?? coverState.formError ?? certState.formError}
        </div>
      ) : null}
      {state.successMessage ||
      coverState.successMessage ||
      certState.successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {state.successMessage ??
            coverState.successMessage ??
            certState.successMessage}
        </div>
      ) : null}

      <form action={formAction} className="admin-card space-y-5 p-5 sm:p-6">
        {mode === "edit" && achievement ? (
          <input type="hidden" name="achievementId" value={achievement.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">عنوان افتخار</span>
            <input
              name="title"
              required
              defaultValue={achievement?.title ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">دانش‌آموز</span>
            <select
              name="studentId"
              required
              defaultValue={achievement?.studentId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب دانش‌آموز</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.gradeName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">دسته‌بندی</span>
            <select
              name="categoryId"
              required
              defaultValue={achievement?.categoryId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب دسته</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">تاریخ</span>
            <input
              name="achievementDate"
              type="date"
              dir="ltr"
              defaultValue={achievement?.achievementDate ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">سال تحصیلی</span>
            <input
              name="schoolYear"
              placeholder="1404-1405"
              defaultValue={achievement?.schoolYear ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">صادرکننده</span>
            <input
              name="issuer"
              defaultValue={achievement?.issuer ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">سطح</span>
            <input
              name="level"
              defaultValue={achievement?.level ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">رتبه / مقام</span>
            <input
              name="place"
              defaultValue={achievement?.place ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">امتیاز / نمره</span>
            <input
              name="score"
              defaultValue={achievement?.score ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">توضیح کوتاه</span>
            <input
              name="shortDescription"
              defaultValue={achievement?.shortDescription ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">توضیحات کامل</span>
            <textarea
              name="description"
              rows={5}
              defaultValue={achievement?.description ?? ""}
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
              defaultValue={achievement?.slug ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">ترتیب نمایش</span>
            <input
              name="displayOrder"
              type="number"
              defaultValue={achievement?.displayOrder ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">اولویت ویژه</span>
            <input
              name="featuredPriority"
              type="number"
              defaultValue={achievement?.featuredPriority ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">عنوان SEO</span>
            <input
              name="seoTitle"
              defaultValue={achievement?.seoTitle ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">توضیح SEO</span>
            <textarea
              name="seoDescription"
              rows={2}
              defaultValue={achievement?.seoDescription ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isPublished"
              value="true"
              defaultChecked={achievement?.isPublished ?? false}
            />
            منتشر شده
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isFeatured"
              value="true"
              defaultChecked={achievement?.isFeatured ?? false}
            />
            ویژه
          </label>
          {mode === "edit" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={Boolean(achievement?.archivedAt)}
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
            {pending
              ? "در حال ذخیره…"
              : mode === "create"
                ? "ثبت افتخار"
                : "ذخیره تغییرات"}
          </button>
          <Link
            href="/admin/website/achievements"
            className="rounded-xl border border-border px-5 py-2.5 text-sm"
          >
            بازگشت
          </Link>
        </div>
      </form>

      {mode === "edit" && achievement ? (
        <>
          <form action={coverAction} className="admin-card space-y-3 p-5">
            <input
              type="hidden"
              name="achievementId"
              value={achievement.id}
            />
            <h2 className="font-semibold text-primary">تصویر کاور</h2>
            {achievement.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={achievement.coverUrl}
                alt={achievement.title}
                className="h-36 w-48 rounded-2xl object-cover"
              />
            ) : (
              <p className="text-sm text-muted">هنوز کاوری بارگذاری نشده است.</p>
            )}
            <input
              type="file"
              name="cover"
              accept="image/jpeg,image/png,image/webp"
            />
            <input
              name="altText"
              placeholder="متن جایگزین"
              defaultValue={achievement.title}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={coverPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {coverPending ? "در حال بارگذاری…" : "بارگذاری کاور"}
            </button>
          </form>

          <form action={certAction} className="admin-card space-y-3 p-5">
            <input
              type="hidden"
              name="achievementId"
              value={achievement.id}
            />
            <h2 className="font-semibold text-primary">گواهی</h2>
            {achievement.certificateUrl ? (
              <a
                href={achievement.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                مشاهده گواهی فعلی
              </a>
            ) : (
              <p className="text-sm text-muted">هنوز گواهی بارگذاری نشده است.</p>
            )}
            <input
              type="file"
              name="certificate"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
            <p className="text-xs text-muted">
              تصویر یا PDF · حداکثر ۸ مگابایت
            </p>
            <input
              name="altText"
              placeholder="متن جایگزین"
              defaultValue={achievement.title}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={certPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {certPending ? "در حال بارگذاری…" : "بارگذاری گواهی"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
