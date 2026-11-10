import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/shop/config";
import { startUrl, zibalRequest, zibalVerify } from "@/lib/shop/zibal";
import { chargeRials } from "./catalog";

const newToken = () => randomBytes(24).toString("base64url");

export async function startCoursePayment(studentId: string, courseId: string) {
  const [course, student, enrolled] = await Promise.all([
    prisma.classCourse.findUnique({ where: { id: courseId } }),
    prisma.classStudent.findUnique({ where: { id: studentId } }),
    prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } }),
  ]);
  if (!course || !course.published || !student) return { ok: false as const, error: "دوره پیدا نشد." };
  if (enrolled) return { ok: false as const, error: "قبلاً در این دوره ثبت‌نام کرده‌ای." };
  const amount = chargeRials(course);
  if (amount <= 0) return { ok: false as const, error: "این دوره پرداخت لازم ندارد." };
  if (amount < 1000) return { ok: false as const, error: "مبلغ دوره برای پرداخت آنلاین خیلی کم است." };
  const token = newToken();
  const pay = await prisma.classPayment.create({ data: { courseId, studentId, amountRials: amount, token } });
  const r = await zibalRequest({
    amountRials: amount,
    callbackUrl: `${siteUrl()}/classes/pay/callback?token=${encodeURIComponent(token)}`,
    orderId: `cls-${pay.id.slice(-8)}`,
    mobile: student.mobile,
    description: `دوره ${course.title}`.slice(0, 120),
  });
  if (!r.ok) {
    await prisma.classPayment.update({ where: { id: pay.id }, data: { status: "FAILED", message: r.error, result: "result" in r ? (r.result as number) : null } });
    return { ok: false as const, error: r.error };
  }
  await prisma.classPayment.update({ where: { id: pay.id }, data: { trackId: r.trackId } });
  return { ok: true as const, url: startUrl(r.trackId) };
}

export async function settleCoursePayment(token: string, query: { trackId?: string | null; success?: string | null }) {
  const pay = await prisma.classPayment.findUnique({ where: { token }, include: { course: { select: { slug: true, title: true } } } });
  if (!pay) return { kind: "failed" as const, message: "پرداخت پیدا نشد.", slug: "" };
  if (pay.status === "PAID") return { kind: "paid" as const, slug: pay.course.slug };
  if (!pay.trackId || (query.trackId && query.trackId !== pay.trackId)) return { kind: "failed" as const, message: "اطلاعات درگاه با پرداخت مطابقت ندارد.", slug: pay.course.slug };
  if (query.success === "0") {
    await prisma.classPayment.updateMany({ where: { id: pay.id, status: "PENDING" }, data: { status: "FAILED", message: "انصراف یا خطا در پرداخت" } });
    return { kind: "failed" as const, message: "پرداخت انجام نشد یا لغو شد.", slug: pay.course.slug };
  }
  const v = await zibalVerify(pay.trackId);
  if (v.kind === "error") return { kind: "pending" as const, message: "تأیید پرداخت از درگاه انجام نشد. اگر مبلغ کم شده، چند دقیقه بعد این صفحه را تازه کنید.", slug: pay.course.slug };
  if (v.kind === "failed") {
    await prisma.classPayment.updateMany({ where: { id: pay.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "FAILED", result: v.result, message: v.message } });
    return { kind: "failed" as const, message: "پرداخت تأیید نشد.", slug: pay.course.slug };
  }
  if (v.amountRials !== pay.amountRials) {
    await prisma.classPayment.update({ where: { id: pay.id }, data: { result: v.result, message: `مغایرت مبلغ: ${v.amountRials}` } });
    return { kind: "pending" as const, message: "مبلغ پرداختی با قیمت دوره یکی نیست. همکاران ما بررسی می‌کنند.", slug: pay.course.slug };
  }
  await prisma.$transaction(async (tx) => {
    const flipped = await tx.classPayment.updateMany({
      where: { id: pay.id, status: { not: "PAID" } },
      data: { status: "PAID", result: v.result, refNumber: v.refNumber, cardNumber: v.cardNumber, paidAt: new Date(), message: null },
    });
    if (flipped.count !== 1) return;
    await tx.classEnrollment.upsert({
      where: { studentId_courseId: { studentId: pay.studentId, courseId: pay.courseId } },
      create: { studentId: pay.studentId, courseId: pay.courseId, source: "PAID" },
      update: {},
    });
  });
  return { kind: "paid" as const, slug: pay.course.slug };
}
