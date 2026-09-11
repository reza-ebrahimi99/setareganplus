"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { previewManagedGuidanceDiscountForStudent } from "@/lib/guidance/discounts/student";
import { startGuidancePackageCheckout } from "@/lib/guidance/journey/payment";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import {
  guidanceJourneyV2StepPath,
} from "@/lib/guidance/journey-v2/catalog";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { packageIncludesArrangement } from "@/lib/guidance/journey-v2/entitlements";
import { resolveGuidancePayablePackage } from "@/lib/guidance/packages/resolve-payable";
import { prisma } from "@/lib/prisma";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function publicCheckoutError(raw: string): string {
  const known = [
    "کد تخفیف",
    "ظرفیت",
    "بسته",
    "درگاه",
    "مبلغ",
    "پرداخت",
    "پرونده",
    "محاسبه",
    "اعتبار",
    "غیرفعال",
    "زمان استفاده",
    "جمع تخفیف",
    "لینک",
  ];
  if (known.some((token) => raw.includes(token))) return raw;
  return "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید.";
}

export type GuidanceV2DiscountPreviewState =
  | {
      ok: true;
      code: string;
      label: string;
      originalAmountRials: number;
      discountRials: number;
      finalAmountRials: number;
      packageCode: string;
    }
  | { ok: false; error: string }
  | null;

export type GuidanceV2Step10State = {
  error?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
};

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function previewGuidanceV2Step10DiscountAction(
  packageCode: string,
  discountCode: string,
): Promise<Exclude<GuidanceV2DiscountPreviewState, null>> {
  try {
    const preview = await previewManagedGuidanceDiscountForStudent(
      packageCode,
      discountCode,
    );
    return preview.result;
  } catch {
    return {
      ok: false,
      error: "بررسی کد تخفیف انجام نشد. لطفاً دوباره تلاش کنید.",
    };
  }
}

export async function submitGuidanceV2Step10Action(
  _prev: GuidanceV2Step10State,
  formData: FormData,
): Promise<GuidanceV2Step10State> {
  const access = await requireGuidanceV2StepAccess(10);
  const packageCode = field(formData, "packageCode");
  const discountCode = field(formData, "discountCode");
  const pkg = resolveGuidancePayablePackage(packageCode, { journeyVersion: 2 });
  if (!pkg) {
    return { error: "بسته انتخاب‌شده معتبر نیست." };
  }

  const alreadyHasArrangement = Boolean(
    access.plan.packagePaidAtIso &&
      packageIncludesArrangement(access.plan.guidancePackageCode),
  );
  if (alreadyHasArrangement) {
    redirect(guidanceJourneyV2StepPath(Math.max(access.plan.currentStep, 11)));
  }

  if (!pkg.requiresPayment) {
    await prisma.guidancePlan.update({
      where: { id: access.plan.id },
      data: {
        guidancePackageCode: pkg.code,
        packagePaidAt: new Date(),
      },
    });
    if (access.plan.currentStep === 10) {
      const advanced = await advanceGuidanceJourneyV2Step({
        organizationId: access.plan.organizationId,
        actorUserId: access.context.user.id,
        studentId: access.plan.studentId,
        stepId: 10,
        metadata: { packageCode: pkg.code, path: "free" },
      });
      if (!advanced.ok) {
        return { error: advanced.error };
      }
    }
    revalidatePath(guidanceJourneyV2StepPath(10));
    revalidatePath("/portal/student/services/guidance");
    redirect(guidanceJourneyV2StepPath(11));
  }

  try {
    const started = await startGuidancePackageCheckout({
      organizationId: access.plan.organizationId,
      planId: access.plan.id,
      planPublicId: access.plan.publicId,
      packageCode: pkg.code,
      discountCode: discountCode || null,
    });

    if (!started.ok) {
      return { error: publicCheckoutError(started.error) };
    }

    revalidatePath(guidanceJourneyV2StepPath(10));
    // Never redirect() to an external Zibal URL from this server action.
    // useActionState cannot reliably follow that redirect; the client
    // navigates from the returned checkoutUrl instead.
    return {
      checkoutUrl: started.checkoutUrl,
      paymentIntentId: started.paymentIntentId,
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("[guidance.checkout] step10_action_failed", {
      packageCode: pkg.code,
      hasDiscount: Boolean(discountCode),
    });
    return {
      error: "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید.",
    };
  }
}
