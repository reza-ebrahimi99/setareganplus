"use server";

/**
 * Local compile companion for Holland report checkout UI.
 * Production already has the live action. Do not pack this stub.
 */

export async function startHollandReportCheckoutAction(
  _prev: { error?: string },
  _formData: FormData,
): Promise<{ error?: string }> {
  return {
    error: "پرداخت جداگانه گزارش رغبت‌سنجی از این مسیر در دسترس نیست.",
  };
}
