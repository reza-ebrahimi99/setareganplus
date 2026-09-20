"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { previewManagedGuidanceDiscountForStudent } from "@/lib/guidance/discounts/student";
import { startGuidancePackageCheckout } from "@/lib/guidance/journey/payment";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import {
  hasValidGuidanceCommercialPurchase,
  packageIncludesArrangement,
} from "@/lib/guidance/journey-v2/entitlements";
import { resolveGuidanceNewSaleCheckout } from "@/lib/guidance/packages/resolve-payable";

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
    "افزونه",
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

function parseFarhangianAddon(formData: FormData): boolean {
  const raw = field(formData, "farhangianAddon");
  return raw === "1" || raw === "true" || raw === "on";
}

export async function previewGuidanceV2Step10DiscountAction(
  packageCode: string,
  discountCode: string,
  farhangianAddon = false,
): Promise<Exclude<GuidanceV2DiscountPreviewState, null>> {
  try {
    const preview = await previewManagedGuidanceDiscountForStudent(
      packageCode,
      discountCode,
      farhangianAddon,
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
  const farhangianAddon = parseFarhangianAddon(formData);

  const resolved = resolveGuidanceNewSaleCheckout({
    packageCode,
    farhangianAddon,
  });
  if (!resolved.ok) {
    return { error: resolved.error };
  }

  const profile = {
    packageCode: access.plan.guidancePackageCode,
    packageAddons: access.plan.guidancePackageAddons,
    packagePaidAtIso: access.plan.packagePaidAtIso,
  };
  const alreadyPaidCommercial = hasValidGuidanceCommercialPurchase(profile);
  const alreadyHasArrangement =
    alreadyPaidCommercial &&
    packageIncludesArrangement(
      access.plan.guidancePackageCode,
      access.plan.guidancePackageAddons,
    );
  if (alreadyHasArrangement) {
    redirect(guidanceJourneyV2StepPath(Math.max(access.plan.currentStep, 11)));
  }

  try {
    const started = await startGuidancePackageCheckout({
      organizationId: access.plan.organizationId,
      planId: access.plan.id,
      planPublicId: access.plan.publicId,
      packageCode: resolved.quote.planPackageCode,
      farhangianAddon,
      discountCode: discountCode || null,
    });

    if (!started.ok) {
      return { error: publicCheckoutError(started.error) };
    }

    revalidatePath(guidanceJourneyV2StepPath(10));
    return {
      checkoutUrl: started.checkoutUrl,
      paymentIntentId: started.paymentIntentId,
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("[guidance.checkout] step10_action_failed", {
      packageCode: resolved.quote.planPackageCode,
      hasDiscount: Boolean(discountCode),
      farhangianAddon,
    });
    return {
      error: "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید.",
    };
  }
}
