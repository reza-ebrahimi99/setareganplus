"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerm, logAction } from "@/lib/auth";
import { b, s, sn } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { isGradeId } from "@/lib/consult/constants";
import { issueStudentCode, rotateStudentCode } from "@/lib/consult/students";
import { normalizeIranMobile } from "@/lib/format";

export type StudentFormState = { ok: true; code: string; name: string } | { ok: false; error: string } | null;

export async function createStudent(_prev: StudentFormState, fd: FormData): Promise<StudentFormState> {
  const me = await requirePerm("consult.students");
  const mobileRaw = s(fd, "mobile");
  const mobile = mobileRaw ? normalizeIranMobile(mobileRaw) : null;
  if (mobileRaw && !mobile) return { ok: false, error: "شماره موبایل معتبر نیست. اگر خالی بماند، دانش‌آموز موقع رزرو باید پیامک تأیید کند." };
  const grade = s(fd, "grade");
  const res = await issueStudentCode({
    fullName: s(fd, "fullName"),
    mobile,
    grade: grade && isGradeId(grade) ? grade : null,
    note: sn(fd, "note"),
  });
  if (!res.ok) return res;
  await logAction(me, "consult.student", `دانش‌آموز و کد تازه: ${res.name} (…${res.code.slice(-4)})`, res.id);
  revalidatePath("/admin/consult/students");
  return { ok: true, code: res.code, name: res.name };
}

export async function rotateStudent(_prev: StudentFormState, fd: FormData): Promise<StudentFormState> {
  const me = await requirePerm("consult.students");
  const id = s(fd, "id");
  const res = await rotateStudentCode(id);
  if (!res.ok) return res;
  await logAction(me, "consult.student", `تعویض کد: ${res.name}`, id);
  revalidatePath("/admin/consult/students");
  return { ok: true, code: res.code, name: res.name };
}

export async function saveStudent(fd: FormData) {
  const me = await requirePerm("consult.students");
  const id = s(fd, "id");
  const name = s(fd, "fullName");
  if (name.length < 2) redirect("/admin/consult/students?e=name");
  const mobileRaw = s(fd, "mobile");
  const mobile = mobileRaw ? normalizeIranMobile(mobileRaw) : null;
  if (mobileRaw && !mobile) redirect("/admin/consult/students?e=mobile");
  const grade = s(fd, "grade");
  await prisma.enrolledStudent.update({
    where: { id },
    data: {
      fullName: name.slice(0, 80),
      mobile,
      grade: grade && isGradeId(grade) ? grade : null,
      note: sn(fd, "note"),
      active: b(fd, "active"),
    },
  });
  await logAction(me, "consult.student", "ویرایش دانش‌آموز", id);
  revalidatePath("/admin/consult/students");
}
