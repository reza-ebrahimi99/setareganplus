"use client";

import { useActionState } from "react";
import {
  assignStudentToCounselorAction,
  updateCounselorAction,
  uploadCounselorPhotoAction,
  type CounselorActionState,
} from "@/app/admin/counselor/actions";

const initial: CounselorActionState = {};

export function CounselorDetailForms({
  counselorUserId,
  firstName,
  lastName,
  mobile,
  title,
  specialty,
  bio,
  capacity,
  isActive,
  isSupervisor,
  assignableStudents,
}: {
  counselorUserId: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  title: string | null;
  specialty: string | null;
  bio: string | null;
  capacity: number | null;
  isActive: boolean;
  isSupervisor: boolean;
  assignableStudents: Array<{ id: string; fullName: string }>;
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateCounselorAction, initial);
  const [photoState, photoAction, photoPending] = useActionState(uploadCounselorPhotoAction, initial);
  const [assignState, assignAction, assignPending] = useActionState(
    assignStudentToCounselorAction,
    initial,
  );

  return (
    <div className="cos-dashboard-grid">
      <form action={updateAction} className="cos-panel cos-form-stack">
        <h2>پروفایل مشاور</h2>
        <input type="hidden" name="counselorUserId" value={counselorUserId} />
        <div className="cos-form-grid">
          <label>
            نام
            <input name="firstName" defaultValue={firstName} required={isSupervisor} readOnly={!isSupervisor} />
          </label>
          <label>
            نام خانوادگی
            <input name="lastName" defaultValue={lastName} required={isSupervisor} readOnly={!isSupervisor} />
          </label>
          <label>
            موبایل
            <input name="mobile" defaultValue={mobile ?? ""} readOnly={!isSupervisor} />
          </label>
          <label>
            عنوان
            <input name="title" defaultValue={title ?? ""} />
          </label>
          <label>
            تخصص
            <input name="specialty" defaultValue={specialty ?? ""} />
          </label>
          {isSupervisor ? (
            <label>
              ظرفیت (خالی = نامحدود، ۰ = بدون پذیرش جدید)
              <input
                name="capacity"
                type="number"
                min={0}
                defaultValue={capacity ?? ""}
              />
            </label>
          ) : null}
        </div>
        <label>
          معرفی کوتاه
          <textarea name="bio" rows={3} defaultValue={bio ?? ""} />
        </label>
        {isSupervisor ? (
          <label>
            وضعیت
            <select name="isActive" defaultValue={isActive ? "true" : "false"}>
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </select>
          </label>
        ) : null}
        <button type="submit" className="cos-btn cos-btn--primary" disabled={updatePending}>
          {updatePending ? "در حال ذخیره…" : "ذخیره پروفایل"}
        </button>
        {updateState.error ? <p className="cos-error">{updateState.error}</p> : null}
        {updateState.success ? <p className="cos-success">{updateState.success}</p> : null}
      </form>

      <form action={photoAction} className="cos-panel cos-form-stack">
        <h2>تصویر پروفایل</h2>
        <input type="hidden" name="counselorUserId" value={counselorUserId} />
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required />
        <button type="submit" className="cos-btn" disabled={photoPending}>
          {photoPending ? "در حال بارگذاری…" : "بارگذاری تصویر"}
        </button>
        {photoState.error ? <p className="cos-error">{photoState.error}</p> : null}
        {photoState.success ? <p className="cos-success">{photoState.success}</p> : null}
      </form>

      {isSupervisor ? (
        <form action={assignAction} className="cos-panel cos-form-stack">
          <h2>تخصیص دانش‌آموز مسیر V2</h2>
          <input type="hidden" name="counselorUserId" value={counselorUserId} />
          <select name="studentId" required defaultValue="">
            <option value="" disabled>
              انتخاب دانش‌آموز
            </option>
            {assignableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
          <label className="cos-check">
            <input type="checkbox" name="overrideCapacity" value="1" />
            تأیید صریح عبور از ظرفیت
          </label>
          <button type="submit" className="cos-btn cos-btn--primary" disabled={assignPending}>
            {assignPending ? "در حال تخصیص…" : "تخصیص"}
          </button>
          {assignState.error ? <p className="cos-error">{assignState.error}</p> : null}
          {assignState.success ? <p className="cos-success">{assignState.success}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
