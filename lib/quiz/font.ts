import localFont from "next/font/local";

/**
 * Vazirmatn (SIL OFL) — scoped to the study-quiz campaign only.
 * Static woff2 files live in public/fonts/vazirmatn/ (also referenced here for next/font).
 * Site header/footer keep the root layout font.
 */
export const quizVazirmatn = localFont({
  src: [
    { path: "../../public/fonts/vazirmatn/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/vazirmatn/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/vazirmatn/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/vazirmatn/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/vazirmatn/Vazirmatn-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "../../public/fonts/vazirmatn/Vazirmatn-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-quiz-vazir",
  display: "swap",
  preload: true,
});

/** Apply on the quiz page wrapper (not header/footer). */
export const quizFontClass = `${quizVazirmatn.variable} ${quizVazirmatn.className}`;
