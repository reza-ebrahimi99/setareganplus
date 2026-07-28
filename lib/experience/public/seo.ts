/**
 * Pure SEO text precedence for registration landing (no DB).
 */

export function resolveLandingSeoText(input: {
  flowTitle: string;
  flowDescription: string;
  experienceSeoTitle?: string | null;
  experienceSeoDescription?: string | null;
}): { title: string; description: string } {
  const seoTitle = input.experienceSeoTitle?.trim();
  const seoDescription = input.experienceSeoDescription?.trim();
  return {
    title: seoTitle
      ? seoTitle.includes("ستارگان")
        ? seoTitle
        : `${seoTitle} | ستارگان پلاس`
      : `${input.flowTitle} | ستارگان پلاس`,
    description:
      seoDescription ||
      input.flowDescription ||
      "ثبت‌نام آنلاین در ستارگان پلاس",
  };
}
