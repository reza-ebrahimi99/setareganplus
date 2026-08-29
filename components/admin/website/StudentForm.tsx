"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createStudent,
  updateStudent,
  uploadPortrait,
  type StudentActionState,
} from "@/app/admin/(dashboard)/website/students/actions";

type GradeOption = { id: string; name: string; requiresMajor: boolean };
type MajorOption = { id: string; name: string };

type StudentFormProps = {
  mode: "create" | "edit";
  grades: GradeOption[];
  majors: MajorOption[];
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    gradeId: string;
    majorId: string | null;
    biography: string;
    parentName: string | null;
    schoolYear: string | null;
    slug: string;
    kanoonStudentId: string | null;
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

const initial: StudentActionState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm";

export function StudentForm({
  mode,
  grades,
  majors,
  student,
}: StudentFormProps) {
  const action = mode === "create" ? createStudent : updateStudent;
  const [state, formAction, pending] = useActionState(action, initial);
  const [portraitState, portraitAction, portraitPending] = useActionState(
    uploadPortrait,
    initial,
  );
  const [selectedGradeId, setSelectedGradeId] = useState(
    student?.gradeId ?? "",
  );
  const selectedGrade = grades.find((grade) => grade.id === selectedGradeId);
  const showMajor = Boolean(selectedGrade?.requiresMajor);

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
        {mode === "edit" && student ? (
          <input type="hidden" name="studentId" value={student.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">نام</span>
            <input
              name="firstName"
              required
              defaultValue={student?.firstName ?? ""}
              className={inputClass}
            />
            {state.fieldErrors?.firstName ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.firstName}
              </span>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">نام خانوادگی</span>
            <input
              name="lastName"
              required
              defaultValue={student?.lastName ?? ""}
              className={inputClass}
            />
            {state.fieldErrors?.lastName ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.lastName}
              </span>
            ) : null}
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">پایه تحصیلی</span>
            <select
              name="gradeId"
              required
              value={selectedGradeId}
              onChange={(event) => setSelectedGradeId(event.target.value)}
              className={inputClass}
            >
              <option value="">انتخاب پایه</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.gradeId ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.gradeId}
              </span>
            ) : null}
          </label>
          {showMajor ? (
            <label className="text-sm sm:col-span-2">
              <span className="font-medium text-primary">رشته تحصیلی</span>
              <select
                name="majorId"
                required
                defaultValue={student?.majorId ?? ""}
                className={inputClass}
              >
                <option value="">انتخاب رشته</option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.majorId ? (
                <span className="mt-1 block text-xs text-red-700">
                  {state.fieldErrors.majorId}
                </span>
              ) : null}
            </label>
          ) : null}
          <label className="text-sm">
            <span className="font-medium text-primary">نام ولی (اختیاری)</span>
            <input
              name="parentName"
              defaultValue={student?.parentName ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">سال تحصیلی (اختیاری)</span>
            <input
              name="schoolYear"
              placeholder="1404-1405"
              defaultValue={student?.schoolYear ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">بیوگرافی / معرفی</span>
            <textarea
              name="biography"
              rows={5}
              defaultValue={student?.biography ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">شناسه قلم‌چی</span>
            <input
              name="kanoonStudentId"
              dir="ltr"
              inputMode="numeric"
              defaultValue={student?.kanoonStudentId ?? ""}
              className={inputClass}
              placeholder="مثال: 00123456"
            />
            <span className="mt-1 block text-xs text-muted">
              شماره شمارنده دانش‌آموز در آزمون‌های قلم‌چی
            </span>
            {state.fieldErrors?.kanoonStudentId ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.kanoonStudentId}
              </span>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">Slug</span>
            <input
              name="slug"
              dir="ltr"
              defaultValue={student?.slug ?? ""}
              className={inputClass}
              placeholder="auto-from-name"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">ترتیب نمایش</span>
            <input
              name="displayOrder"
              type="number"
              defaultValue={student?.displayOrder ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">اولویت ویژه</span>
            <input
              name="featuredPriority"
              type="number"
              defaultValue={student?.featuredPriority ?? 0}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">عنوان SEO</span>
            <input
              name="seoTitle"
              defaultValue={student?.seoTitle ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">توضیح SEO</span>
            <textarea
              name="seoDescription"
              rows={2}
              defaultValue={student?.seoDescription ?? ""}
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
              defaultChecked={student?.isActive ?? true}
            />
            فعال
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isFeatured"
              value="true"
              defaultChecked={student?.isFeatured ?? false}
            />
            نمایش ویژه
          </label>
          {mode === "edit" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={Boolean(student?.archivedAt)}
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
                ? "ثبت دانش‌آموز"
                : "ذخیره تغییرات"}
          </button>
          <Link
            href="/admin/website/students"
            className="rounded-xl border border-border px-5 py-2.5 text-sm"
          >
            بازگشت
          </Link>
        </div>
      </form>

      {mode === "edit" && student ? (
        <form action={portraitAction} className="admin-card space-y-3 p-5">
          <input type="hidden" name="studentId" value={student.id} />
          <h2 className="font-semibold text-primary">تصویر پروفایل</h2>
          {student.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.portraitUrl}
              alt={student.fullName}
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
            حداکثر ۲ مگابایت · JPEG / PNG / WebP · نسخه‌های ۴۸۰ و ۹۶۰ پیکسل
            ساخته می‌شود.
          </p>
          <input
            name="altText"
            placeholder="متن جایگزین تصویر"
            defaultValue={student.fullName}
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
