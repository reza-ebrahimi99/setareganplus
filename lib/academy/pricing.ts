import {
  AcademyCourseStatus,
  AcademyDiscountType,
  AcademyLessonStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type CheckoutItemInput =
  | { kind: "COURSE"; courseId: string }
  | { kind: "LESSON"; lessonId: string };

export type CheckoutQuoteLine = {
  kind: "COURSE" | "LESSON";
  courseId: string | null;
  lessonId: string | null;
  title: string;
  unitPriceRials: number;
  compareAtPriceRials: number | null;
  lineTotalRials: number;
};

export type CheckoutQuote = {
  lines: CheckoutQuoteLine[];
  subtotalRials: number;
  discountRials: number;
  totalRials: number;
  discountCodeId: string | null;
  discountCodeLabel: string | null;
};

function normalizeDiscountCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

export async function calculateCheckout(params: {
  organizationId: string;
  userId: string;
  items: CheckoutItemInput[];
  discountCode?: string | null;
}): Promise<{ ok: true; quote: CheckoutQuote } | { ok: false; error: string }> {
  if (params.items.length === 0) {
    return { ok: false, error: "سبد خرید خالی است." };
  }
  if (params.items.length > 1) {
    return { ok: false, error: "در حال حاضر فقط یک محصول در هر سفارش پشتیبانی می‌شود." };
  }

  const item = params.items[0]!;
  let line: CheckoutQuoteLine;

  if (item.kind === "COURSE") {
    const course = await prisma.academyCourse.findFirst({
      where: {
        id: item.courseId,
        organizationId: params.organizationId,
        deletedAt: null,
        status: AcademyCourseStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        priceRials: true,
        compareAtPriceRials: true,
        lifetimeAccess: true,
      },
    });
    if (!course) return { ok: false, error: "دوره یافت نشد." };
    if (course.priceRials <= 0) {
      return { ok: false, error: "این دوره رایگان است و نیازی به پرداخت ندارد." };
    }

    const owns = await prisma.academyContentEntitlement.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        courseId: course.id,
        lessonId: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (owns && course.lifetimeAccess) {
      return { ok: false, error: "شما قبلاً به این دوره دسترسی دارید." };
    }

    line = {
      kind: "COURSE",
      courseId: course.id,
      lessonId: null,
      title: course.title,
      unitPriceRials: course.priceRials,
      compareAtPriceRials: course.compareAtPriceRials,
      lineTotalRials: course.priceRials,
    };
  } else {
    const lesson = await prisma.academyLesson.findFirst({
      where: {
        id: item.lessonId,
        organizationId: params.organizationId,
        sellIndividually: true,
        status: AcademyLessonStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        courseId: true,
        individualPriceRials: true,
      },
    });
    if (!lesson?.individualPriceRials || lesson.individualPriceRials <= 0) {
      return { ok: false, error: "ویدئو برای فروش تکی در دسترس نیست." };
    }

    const now = new Date();
    const ownsLesson = await prisma.academyContentEntitlement.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        revokedAt: null,
        AND: [
          {
            OR: [
              { lessonId: lesson.id },
              { courseId: lesson.courseId, lessonId: null },
            ],
          },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      select: { id: true },
    });
    if (ownsLesson) {
      return { ok: false, error: "شما قبلاً به این محتوا دسترسی دارید." };
    }

    line = {
      kind: "LESSON",
      courseId: lesson.courseId,
      lessonId: lesson.id,
      title: lesson.title,
      unitPriceRials: lesson.individualPriceRials,
      compareAtPriceRials: null,
      lineTotalRials: lesson.individualPriceRials,
    };
  }

  const subtotalRials = line.lineTotalRials;
  let discountRials = 0;
  let discountCodeId: string | null = null;
  let discountCodeLabel: string | null = null;

  const codeRaw = normalizeDiscountCode(params.discountCode);
  if (codeRaw) {
    const code = await prisma.academyDiscountCode.findFirst({
      where: {
        organizationId: params.organizationId,
        code: codeRaw,
        isActive: true,
      },
    });
    if (!code) return { ok: false, error: "کد تخفیف نامعتبر است." };

    const now = new Date();
    if (code.startsAt && now < code.startsAt) {
      return { ok: false, error: "کد تخفیف هنوز فعال نشده است." };
    }
    if (code.endsAt && now > code.endsAt) {
      return { ok: false, error: "کد تخفیف منقضی شده است." };
    }
    if (code.maxUses != null && code.usageCount >= code.maxUses) {
      return { ok: false, error: "سقف استفاده از این کد تکمیل شده است." };
    }
    if (code.minCartRials != null && subtotalRials < code.minCartRials) {
      return { ok: false, error: "مبلغ سبد برای این کد کافی نیست." };
    }

    const userUses = await prisma.academyDiscountRedemption.count({
      where: {
        organizationId: params.organizationId,
        discountCodeId: code.id,
        userId: params.userId,
      },
    });
    if (userUses >= code.perUserLimit) {
      return { ok: false, error: "شما قبلاً از این کد استفاده کرده‌اید." };
    }

    if (code.courseId && line.courseId && code.courseId !== line.courseId) {
      return { ok: false, error: "این کد برای این محصول قابل استفاده نیست." };
    }

    if (code.type === AcademyDiscountType.PERCENTAGE) {
      discountRials = Math.floor((subtotalRials * code.value) / 100);
    } else {
      discountRials = Math.min(subtotalRials, code.value);
    }
    discountCodeId = code.id;
    discountCodeLabel = code.code;
  }

  const totalRials = Math.max(0, subtotalRials - discountRials);
  if (totalRials > 0 && totalRials < 1000) {
    return { ok: false, error: "مبلغ پرداخت کمتر از حد مجاز درگاه است." };
  }

  return {
    ok: true,
    quote: {
      lines: [line],
      subtotalRials,
      discountRials,
      totalRials,
      discountCodeId,
      discountCodeLabel,
    },
  };
}
